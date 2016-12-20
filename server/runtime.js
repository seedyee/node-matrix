const nodes = require('./nodes')
const storage = require('./storage')
const log = require('./log')
const events = require('./events')
const settings = require('../settings')
const api = require('./api')
const util = require('./utils/redUtils')

function init() {
  nodes.init(runtime)
}

function start() {
  console.log('\n==================== Welcome ============================\n')
  log.info(`Node-Matrix version v${settings.version}`)
  log.info(`Node.js version ${process.version}`)
  nodes.load()
  return nodes.loadFlows().then(nodes.startFlows)
}

function stop() {
  return nodes.stopFlows()
}

var runtime = module.exports = {
  init,
  start,
  stop,
  log,
  settings,
  storage,
  events,
  nodes,
  util,
  get adminApi() { return api },
}
