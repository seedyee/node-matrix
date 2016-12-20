const clone = require('clone')
const redUtil = require('../utils/redUtils')

module.exports = {
  parseConfig: function(config) {
    const flow = {}
    flow.allNodes = {}
    flow.configs = {}
    flow.flows = {}

    config.forEach(function(n) {
      flow.allNodes[n.id] = clone(n)
      if (n.type === 'tab') {
        flow.flows[n.id] = n
        flow.flows[n.id].configs = {}
        flow.flows[n.id].nodes = {}
      }
    })
    config.forEach(function(n) {
      if (n.type !== 'tab') {
        if (n.z && n.x && n.y) {
          flow.flows[n.z].nodes[n.id] = n
        } else {
          // websocket-linstener node don't have x, y, z property
          // { id: '18e5343.4be2acc',
          //   type: 'websocket-listener',
          //   path: '/public/receive',
          //   wholemsg: 'false'
          // },
          // { id: '17426626.71220a',
          //   type: 'websocket-listener',
          //   path: '/public/publish',
          //   wholemsg: 'false',
          // },
          flow.configs[n.id] = n
        }
      }
    })
    var addedTabs = {}
    config.forEach(function(n) {
      if (n.type !== 'tab') {
        if (n.z) {
          if (!flow.flows[n.z]) {
            flow.flows[n.z] = {type:'tab', id: n.z}
            flow.flows[n.z].configs = {}
            flow.flows[n.z].nodes = {}
            addedTabs[n.z] = flow.flows[n.z]
          }
          if (addedTabs[n.z]) {
            if (n.hasOwnProperty('x') && n.hasOwnProperty('y')) {
              addedTabs[n.z].nodes[n.id] = n
            } else {
              addedTabs[n.z].configs[n.id] = n
            }
          }
        }
      }
    })
    return flow
  },

  mapEnvVarProperties,
}

function mapEnvVarProperties(obj,prop) {
  if (Buffer.isBuffer(obj[prop])) {
    return
  } else if (Array.isArray(obj[prop])) {
    for (var i=0; i<obj[prop].length; i++) {
      mapEnvVarProperties(obj[prop],i)
    }
  } else if (typeof obj[prop] === 'string') {
    var m
    if ( (m = /^\$\((\S+)\)$/.exec(obj[prop])) !== null) {
      if (process.env.hasOwnProperty(m[1])) {
        obj[prop] = process.env[m[1]]
      }
    }
  } else {
    for (var p in obj[prop]) {
      if (obj[prop].hasOwnProperty(p)) {
        mapEnvVarProperties(obj[prop],p)
      }
    }
  }
}
