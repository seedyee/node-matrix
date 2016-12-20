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
  flows.init(_runtime)
  nodes.init(_runtime)
  ui.init()

  const editorApp = express()
  editorApp.get('/', ui.ensureSlash, ui.editor)
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
