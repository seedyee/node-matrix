const http = require('http')
const https = require('https')
const util = require('util')
const express = require('express')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const path = require('path')

const RED = require('./red/red.js')
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
RED.init(server)

function basicAuthMiddleware(user, pass) {
  var basicAuth = require('basic-auth')
  var checkPassword
  if (pass.length == '32') {
    // Assume its a legacy md5 password
    checkPassword = function(p) {
      return crypto.createHash('md5').update(p,'utf8').digest('hex') === pass
    }
  } else {
    checkPassword = function(p) {
      return bcrypt.compareSync(p, pass)
    }
  }

  return function(req, res, next) {
    if (req.method === 'OPTIONS') {
      return next()
    }
    const requestUser = basicAuth(req)
    if (!requestUser || requestUser.name !== user || !checkPassword(requestUser.pass)) {
      res.set('WWW-Authenticate', 'Basic realm=Authorization Required')
      return res.sendStatus(401)
    }
    next()
  }
}

app.use(settings.httpEditorRoot, RED.httpAdmin)
if (settings.httpNodeAuth) {
  app.use(settings.httpNodeRoot,basicAuthMiddleware(settings.httpNodeAuth.user,settings.httpNodeAuth.pass))
}
app.use(settings.httpNodeRoot, RED.httpNode)

if (settings.httpStatic) {
  if (settings.httpStaticAuth) {
    app.use('/', basicAuthMiddleware(settings.httpStaticAuth.user,settings.httpStaticAuth.pass))
  }
  app.use('/', express.static(settings.httpStatic))
}


RED.start().then(function() {
  server.on('error', function(err) {
    if (err.errno === 'EADDRINUSE') {
      RED.log.error(`server.unable-to-listen ${listenpath}`)
    } else {
      RED.log.error('server.uncaught-exception')
      RED.log.error(err.stack || err)
    }
    process.exit(1)
  })
  server.listen(settings.uiPort, settings.uiHost, function() {
    RED.log.info(`server.now-running ${listenpath}`)
  })
}).otherwise(function(err) {
  RED.log.error('server.failed-to-start')
  RED.log.error(err.stack || err)
})

process.on('uncaughtException', function(err) {
  util.log('[red] Uncaught Exception:')
  util.log(err.stack || err)
  process.exit(1)
})

process.on('SIGINT', function () {
  RED.stop()
  // TODO: need to allow nodes to close asynchronously before terminating the
  // process - ie, promises
  process.exit()
})
