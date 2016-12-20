const nodes = require('./nodes')
const storage = require('./storage')
const log = require('./log')
const events = require('./events')
const settings = require('../settings')
const api = require('./api')
const util = require('./utils/redUtils')
const comms = require('./comms')

const runtime = {
  init,
  start,
  stop,
  log,
  settings,
  storage,
  events,
  nodes,
  util,
  comms: {
    publish: comms.publish,
  },
  get adminApi() { return api },
}

function init(httpServer, app) {
  runtime.server = httpServer
  // can't reference to api's properties before it has been initialized
  api.init(runtime)
  app.use(settings.httpEditorRoot, api.adminApp)
  app.use(settings.httpNodeRoot, api.nodeApp)
  comms.init(httpServer)
  nodes.init(runtime)
}

function start() {
  console.log('\n==================== Welcome ============================\n')
  log.info(`Node-Matrix version v${settings.version}`)
  log.info(`Node.js version ${process.version}`)
  nodes.load()
  return nodes.loadFlows()
    .then(nodes.startFlows)
    .then(() => {
      comms.start()
    })
}

function stop() {
  return nodes.stopFlows().then(() => {
    comms.stop()
  })
}

module.exports = runtime
