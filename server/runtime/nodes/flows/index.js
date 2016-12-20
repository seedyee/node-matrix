const clone = require('clone')
const when = require('when')

const Flow = require('./Flow')
const context = require('../context')
const flowUtil = require('./util')
const log = require('../../log')
const events = require('../../events')

// init --> loadFlows --> startFlows
// init --> load --> setFlows --> startFlows
// the z property stands for : --> the id (same as their tab id) specifying which tab this node belong to.
var storage = null
var activeConfig = null
var activeFlowConfig = null
var activeFlows = {}
var started = false

function init(runtime) {
  if (started) {
    throw new Error('Cannot init without a stop')
  }
  storage = runtime.storage
  started = false
}

function loadFlows() {
  return storage.getFlows()
}

function load() {
  return setFlows(null, 'load')
}

function setFlows(_config, type) {

  var configSavePromise = null
  var config = null
  var newFlowConfig

  if (_config === null && type === 'load') {
    configSavePromise = loadFlows().then(function(_config) {
      config = clone(_config)
      newFlowConfig = flowUtil.parseConfig(_config)
    })
  } else {
    config = clone(_config)
    newFlowConfig = flowUtil.parseConfig(clone(config))
    configSavePromise = storage.saveFlows(config)
  }

  return configSavePromise
    .then(() => {
      activeConfig = {
        flows: config,
      }
      activeFlowConfig = newFlowConfig
      if (started) {
        return stopFlows().then(function() {
          context.clean(activeFlowConfig)
          start()
        }).catch(function(err) {
          console.log(err)
        })
      }
    })
}

function start() {
  started = true
  log.info('starting flows')
  activeFlows['global'] = Flow.create(activeFlowConfig)
  for (let id in activeFlowConfig.flows) {
    activeFlows[id] = Flow.create(activeFlowConfig, activeFlowConfig.flows[id])
  }
  for (let id in activeFlows) {
    activeFlows[id].start()
  }
  log.info('flows started')
  return when.resolve()
}

function getNode(id) {
  var node
  for (var flowId in activeFlows) {
    node = activeFlows[flowId].getNode(id)
    if (node) {
      return node
    }
  }
  return null
}

function eachNode(cb) {
  for (var id in activeFlowConfig.allNodes) {
    cb(activeFlowConfig.allNodes[id])
  }
}

function getFlows() {
  return activeConfig
}

function delegateStatus(node,statusMessage) {
  if (activeFlows[node.z]) {
    activeFlows[node.z].handleStatus(node,statusMessage)
  }
}

function handleStatus(node,statusMessage) {
  events.emit('node-status',{
    id: node.id,
    status:statusMessage
  })
  if (node.z) {
    delegateStatus(node,statusMessage)
  } else {
    if (activeFlowConfig.configs[node.id]) {
      activeFlowConfig.configs[node.id]._users.forEach(function(id) {
        var userNode = activeFlowConfig.allNodes[id]
        delegateStatus(userNode,statusMessage)
      })
    }
  }
}

function stopFlows() {
  log.info(`stopping flows`)
  started = false
  for (var id in activeFlows) {
    activeFlows[id].stop()
    delete activeFlows[id]
  }
  log.info('flows stopped')
  return when.resolve()
}

module.exports = {
  init,
  load,
  get: getNode,
  eachNode,
  getFlows,
  setFlows,
  startFlows: start,
  stopFlows,
  get started() { return started },
  handleStatus,
  disableFlow: null,
  enableFlow: null,
}
