const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const when = require('when')
const cors = require('cors')

const ui = require('./ui')
const nodes = require('./nodes')
const flows = require('./flows')
const library = require('./library')
const locales = require('./locales')
const comms = require('./comms')
const settings = require('../../settings')

let adminApp
let nodeApp
let server

const errorHandler = function(err, req, res, next) {
  if (err) console.log(err)
  res.status(400).json({error:'unexpected_error', message:err.toString()})
}

function init(_server, _runtime) {
  server = _server
  nodeApp = express()
  comms.init(server)
  adminApp = express()
  const limit = settings.apiMaxLength
  adminApp.use(bodyParser.json({ limit }))
  adminApp.use(bodyParser.urlencoded({ limit, extended: true }))

  if (settings.httpAdminCors) {
    var corsHandler = cors(settings.httpAdminCors)
    adminApp.use(corsHandler)
  }

  adminApp.use('/', ui)
  // Flows
  adminApp.use('/flows', flows({ redNodes: _runtime.nodes }))

  // Nodes
  adminApp.use('/nodes', nodes({ redNodes: _runtime.nodes }))

  // locales
  adminApp.get(/locales\/(.+)\/?$/, locales)

  // Library
  adminApp.use('/Library', library.router)

  // Settings
  adminApp.get('/settings', (req, res) => {
    const { httpNodeRoot, version, paletteCategories, flowFilePretty} = settings
    res.json({ httpNodeRoot, version, paletteCategories, flowFilePretty, user: req.user})

  },errorHandler)

  adminApp.use(errorHandler)
}

function start() {
  comms.start()
}

function stop() {
  comms.stop()
  return when.resolve()
}

module.exports = {
  init: init,
  start: start,
  stop: stop,
  library: {
    register: library.register
  },
  auth: {
    //for backword compatibility
    needsPermission: () => (req, res, next) => { next() },
  },
  comms: {
    publish: comms.publish
  },
  get adminApp() { return adminApp },
  get nodeApp() { return nodeApp },
  get server() { return server },
}
