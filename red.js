const http = require('http')
const https = require('https')
const express = require('express')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const path = require('path')
const { basicAuthMiddleware } = require('./red/utils/basicAuthMiddleware')

const Dot = require('./red/red.js')

const settings = require('./settings')

const listenpath = `${settings.https ? 'https' : 'http'}://${settings.uiHost}:${settings.uiPort}${settings.httpEditorRoot}`
let server
const app = express()

if (settings.https) {
  server = https.createServer(settings.https, app)
} else {
  server = http.createServer(app)
}
server.setMaxListeners(0)
const dot = new Dot(server)


app.use(settings.httpEditorRoot, dot.adminApp)
if (settings.httpNodeAuth) {
  app.use(settings.httpNodeRoot,basicAuthMiddleware(settings.httpNodeAuth.user,settings.httpNodeAuth.pass))
}
app.use(settings.httpNodeRoot, dot.nodeApp)

if (settings.httpStatic) {
  if (settings.httpStaticAuth) {
    app.use('/', basicAuthMiddleware(settings.httpStaticAuth.user,settings.httpStaticAuth.pass))
  }
  app.use('/', express.static(settings.httpStatic))
}


dot.start().then(function() {
  server.on('error', function(err) {
    if (err.errno === 'EADDRINUSE') {
      dot.log.error(`server.unable-to-listen ${listenpath}`)
    } else {
      dot.log.error('server.uncaught-exception')
      dot.log.error(err.stack || err)
    }
    process.exit(1)
  })
  server.listen(settings.uiPort, settings.uiHost, function() {
    dot.log.info(`server.now-running ${listenpath}`)
  })
}).otherwise(function(err) {
  dot.log.error('server.failed-to-start')
  dot.log.error(err.stack || err)
})

process.on('uncaughtException', function(err) {
  console.log('[red] Uncaught Exception:')
  console.log(err.stack || err)
  process.exit(1)
})

process.on('SIGINT', function () {
  dot.stop()
  // TODO: need to allow nodes to close asynchronously before terminating the
  // process - ie, promises
  process.exit()
})
