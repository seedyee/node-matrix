const http = require('http')
const express = require('express')
const path = require('path')

const runtime = require('./runtime')
const api = require('./api')

const settings = require('../settings')
const listenPath = `${settings.https ? 'https' : 'http'}://${settings.uiHost}:${settings.uiPort}${settings.httpEditorRoot}`

const app = express()
const server = http.createServer(app)

function start() {
  return runtime.start().then(function() {
    return api.start()
  })
}

function stop() {
  return runtime.stop().then(function() {
    return api.stop()
  })
}

server.setMaxListeners(0)
runtime.init()
api.init(server, runtime)

app.use(settings.httpEditorRoot, api.adminApp)
app.use(settings.httpNodeRoot, api.nodeApp)

if (settings.httpStatic) {
  app.use('/', express.static(settings.httpStatic))
}

start().then(function() {
  server.on('error', function(err) {
    if (err.errno === 'EADDRINUSE') {
      console.log(`[error] server unable to listen ${listenPath}`)
    } else {
      console.log('[error] server uncaught exception')
      console.log(err)
    }
    process.exit(1)
  })
  server.listen(settings.uiPort, settings.uiHost, function() {
    console.log(`[info] server now running on: ${listenPath}`)
  })
}).catch(function(err) {
  console.log(err)
})

process.on('uncaughtException', function(err) {
  console.log('[error] Uncaught Exception:')
  console.log(err)
  process.exit(1)
})

process.on('SIGINT', function () {
  stop()
  // TODO: need to allow nodes to close asynchronously before terminating the
  // process - ie, promises
  process.exit()
})

