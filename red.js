const http = require('http')
const https = require('https')
const express = require('express')
const path = require('path')

const matrix = require('./red/red.js')

const settings = require('./settings')

const listenPath = `${settings.https ? 'https' : 'http'}://${settings.uiHost}:${settings.uiPort}${settings.httpEditorRoot}`
let server
const app = express()

if (settings.https) {
  server = https.createServer(settings.https, app)
} else {
  server = http.createServer(app)
}
server.setMaxListeners(0)

matrix.init(server)

app.use(settings.httpEditorRoot, matrix.api.adminApp)
app.use(settings.httpNodeRoot, matrix.api.nodeApp)

if (settings.httpStatic) {
  app.use('/', express.static(settings.httpStatic))
}

matrix.start().then(function() {
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
  matrix.stop()
  // TODO: need to allow nodes to close asynchronously before terminating the
  // process - ie, promises
  process.exit()
})
