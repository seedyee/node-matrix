const when = require('when')
const redNodes = require('./nodes')
const storage = require('./storage')
const log = require('./log')
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
  return  storage.init()
             .then(function() { return settings.load(storage)})
             .then(function() {
               console.log('\n==================== Welcome ============================\n')
               log.info(`Node-RED version v${version}`)
               log.info(`Node.js version ${process.version}`)
               return redNodes.load().then(function() {
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
  settings,
  storage,
  events,
  nodes: redNodes,
  util: require('./util'),
  get adminApi() { return adminApi },
  isStarted: () => started,
}
