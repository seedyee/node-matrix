const when = require('when')
const redNodes = require('./nodes')
const storage = require('./storage')
const log = require('./log')
const i18n = require('./i18n')
const events = require('./events')
const settings = require('./settings')
const path = require('path')
const fs = require('fs')
const userSettings = require('../../settings')
const adminApi = require('../api')

const version = userSettings.version
let started = false

function init() {
  redNodes.init(runtime)
  log.init()
  settings.init()
}

function start() {
  return i18n.init()
             .then(function() { return storage.init(runtime)})
             .then(function() { return settings.load(storage)})
             .then(function() {
               console.log('\n\n==================== Welcome ============================\n\n')
               log.info(`Node-RED version v${version}`)
               log.info(`Node.js version ${process.version}`)
               return redNodes.load().then(function() {
                 const nodeErrors = redNodes.getNodeList(function(n) { return n.err != null})
                 if (nodeErrors.length > 0) {
                   log.warn('------------------------------------------------------')
                   nodeErrors.forEach(err => {
                     log.warn(`[${err.name}] ${err.err}`)
                   })
                   log.warn('------------------------------------------------------')
                 }
                 log.info(`runtime.paths.settings ${settings.settingsFile}`)
                 redNodes.loadFlows().then(redNodes.startFlows)
                 started = true
               }).catch((err) => {
                 log.error(err)
               })
             })
}

function stop() {
  started = false
  return redNodes.stopFlows()
}

var runtime = module.exports = {
  init,
  start,
  stop,
  version,
  log,
  i18n,
  settings,
  storage,
  events,
  nodes: redNodes,
  util: require('./util'),
  get adminApi() { return adminApi },
  isStarted: () => started,
}
