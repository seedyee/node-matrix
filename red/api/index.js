const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const when = require('when')
const cors = require('cors')

const ui = require('./ui')
const nodes = require('./nodes')
const flows = require('./flows')
const flow = require('./flow')
const library = require('./library')
const locales = require('./locales')
const comms = require('./comms')

let settings
let log
let adminApp
let nodeApp
let server
let runtime

const errorHandler = function(err, req, res, next) {
  if (err) log.error(err)
  res.status(400).json({error:'unexpected_error', message:err.toString()})
}

const ensureRuntimeStarted = function(req, res, next) {
  if (!runtime.isStarted()) {
    log.error('Node-RED runtime not started')
    res.status(503).send('Not started')
  } else {
    next()
  }
}

function init(_server, _runtime) {
  server = _server
  runtime = _runtime
  settings = runtime.settings
  log = runtime.log
  nodeApp = express()
  comms.init(server, runtime)
  adminApp = express()
  flows.init(runtime)
  flow.init(runtime)
  library.init(adminApp, runtime)
  nodes.init(runtime)

  ui.init(runtime)

  const editorApp = express()
  editorApp.get('/', ensureRuntimeStarted, ui.ensureSlash, ui.editor)
  editorApp.get('/icons/:icon', ui.icon)
  editorApp.use('/', ui.editorResources)
  adminApp.use(editorApp)

  const limit = settings.apiMaxLength
  adminApp.use(bodyParser.json({ limit }))
  adminApp.use(bodyParser.urlencoded({ limit, extended: true }))

  if (settings.httpAdminCors) {
    var corsHandler = cors(settings.httpAdminCors)
    adminApp.use(corsHandler)
  }

  // Flows
  adminApp.get('/flows', flows.get, errorHandler)
  adminApp.post('/flows', flows.post,errorHandler)

  adminApp.get('/flow/:id', flow.get,errorHandler)
  adminApp.post('/flow', flow.post,errorHandler)
  adminApp.delete('/flow/:id', flow.delete,errorHandler)
  adminApp.put('/flow/:id', flow.put,errorHandler)

  // Nodes
  adminApp.get('/nodes', nodes.getAll,errorHandler)

  adminApp.get(/locales\/(.+)\/?$/, locales, errorHandler)

  // Library
  adminApp.post(new RegExp('/library/flows\/(.*)'), library.post,errorHandler)
  adminApp.get('/library/flows', library.getAll,errorHandler)
  adminApp.get(new RegExp('/library/flows\/(.*)'), library.get,errorHandler)

  // Settings
  adminApp.get('/settings', (req, res) => {
    const { httpNodeRoot, version, paletteCategories, flowFilePretty} = settings
    res.json({ httpNodeRoot, version, paletteCategories, flowFilePretty, user: req.user})

  },errorHandler)

  // Error Handler
  //adminApp.use(errorHandler)
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
    // backword compatible
    needsPermission: () => (req, res, next) => { next() },
  },
  comms: {
    publish: comms.publish
  },
  get adminApp() { return adminApp },
  get nodeApp() { return nodeApp },
  get server() { return server },
}
