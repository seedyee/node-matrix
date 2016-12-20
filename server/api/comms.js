const ws = require('ws')
var server
const events = require('../events')
const settings = require('../../settings')
var wsServer
var pendingConnections = []
var activeConnections = []
var retained = {}
var heartbeatTimer
var lastSentTime

function handleStatus(event) {
  publish('status/'+event.id,event.status,true)
}

function init(_server) {
  server = _server

  events.removeListener('node-status', handleStatus)
  events.on('node-status', handleStatus)
}

function start() {
  var webSocketKeepAliveTime = settings.webSocketKeepAliveTime || 15000
  var path = settings.httpEditorRoot
  path = (path.slice(0,1) != '/' ? '/':'') + path + (path.slice(-1) == '/' ? '':'/') + 'comms'
  wsServer = new ws.Server({
    server:server,
    path:path,
    // Disable the deflate option due to this issue
    //  https://github.com/websockets/ws/pull/632
    // that is fixed in the 1.x release of the ws module
    // that we cannot currently pickup as it drops node 0.10 support
    perMessageDeflate: false
  })

  wsServer.on('connection', function(ws) {
    activeConnections.push(ws)
    ws.on('close',function() {
      removeActiveConnection(ws)
    })
    ws.on('message', function(data, flags) {
      var msg = null
      try {
        msg = JSON.parse(data)
      } catch(err) {
        console.log('comms received malformed message : '+err.toString())
        return
      }
      if (msg.subscribe) {
        handleRemoteSubscription(ws,msg.subscribe)
      }
    })
    ws.on('error', function(err) {
      console.log(err.toString())
    })
  })

  wsServer.on('error', function(err) {
    console.log(err.toString())
  })

  lastSentTime = Date.now()

  heartbeatTimer = setInterval(function() {
    var now = Date.now()
    if (now-lastSentTime > webSocketKeepAliveTime) {
      publish('hb',lastSentTime)
    }
  }, webSocketKeepAliveTime)
}

function stop() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
  if (wsServer) {
    wsServer.close()
    wsServer = null
  }
}

function publish(topic,data,retain) {
  if (server) {
    if (retain) {
      retained[topic] = data
    } else {
      delete retained[topic]
    }
    lastSentTime = Date.now()
    activeConnections.forEach(function(conn) {
      publishTo(conn,topic,data)
    })
  }
}

function publishTo(ws,topic,data) {
  var msg = JSON.stringify({topic:topic,data:data})
  try {
    ws.send(msg)
  } catch(err) {
    removeActiveConnection(ws)
    console.log(`comms error send $:err.toString()`)
  }
}

function handleRemoteSubscription(ws,topic) {
  const re = new RegExp('^'+topic.replace(/([\[\]\?\(\)\\\\$\^\*\.|])/g,'\\$1').replace(/\+/g,'[^/]+').replace(/\/#$/,'(\/.*)?')+'$')
  for (var t in retained) {
    if (re.test(t)) {
      publishTo(ws,t,retained[t])
    }
  }
}

function removeActiveConnection(ws) {
  for (var i=0; i<activeConnections.length; i++) {
    if (activeConnections[i] === ws) {
      activeConnections.splice(i,1)
      break
    }
  }
}

module.exports = {
  init:init,
  start:start,
  stop:stop,
  publish:publish,
}

