const when = require('when')
const redNodes = require('./nodes')
const storage = require('./storage')
const log = require('./log')
const events = require('./events')
const path = require('path')
const fs = require('fs')
const userSettings = require('../../settings')
const adminApi = require('../api')

const { version } = userSettings

function init() {
  redNodes.init(runtime)
  log.init()
}

function start() {
  console.log('\n==================== Welcome ============================\n')
  log.info(`Node-RED version v${version}`)
  log.info(`Node.js version ${process.version}`)
  redNodes.load()
  return redNodes.loadFlows().then(redNodes.startFlows)
}

function stop() {
  return redNodes.stopFlows()
}

var runtime = module.exports = {
  init,
  start,
  stop,
  version,
  log,
  settings: userSettings,
  storage,
  events,
  nodes: redNodes,
  util: require('./util'),
  get adminApi() { return adminApi },
}
