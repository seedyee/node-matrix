const clone = require('clone')
const when = require('when')

const Flow = require('./Flow')
const context = require('../context')
const flowUtil = require('./util')
const log = require('../../log')
const events = require('../../events')

var storage = null

var activeConfig = null
var activeFlowConfig = null

var activeFlows = {}
var started = false

var activeNodesToFlow = {}
var subflowInstanceNodeMap = {}

function init(runtime) {
  if (started) {
    throw new Error('Cannot init without a stop')
  }
  storage = runtime.storage
  started = false
}

function loadFlows() {
  return storage.getFlows()
    .then(config => config)
    .catch(err => {
      log.warn(`flows error: error.toString()`)
      console.log(err.stack)
    })
}

/**
 * Load the current flow configuration from storage
 * @return a promise for the loading of the config
 */
function load() {
  return setFlows(null, 'load')
}

/*
 * _config - new node array configuration
 * type - full/nodes/flows/load (default full)
 * muteLog - don't emit the standard log messages (used for individual flow api)
 */

/**
 * Sets the current active config.
 * @param config the configuration to enable
 * @param type the type of deployment to do: full (default), nodes, flows, load
 * @return a promise for the saving/starting of the new flow
 */
function setFlows(_config, type) {

  var configSavePromise = null
  var config = null
  var newFlowConfig

  if (type === 'load') {
    configSavePromise = loadFlows().then(function(_config) {
      config = clone(_config.flows)
      newFlowConfig = flowUtil.parseConfig(clone(config))
      type = 'full'
      return _config.rev
    })
  } else {
    config = clone(_config)
    newFlowConfig = flowUtil.parseConfig(clone(config))
    configSavePromise = storage.saveFlows({ flows: config})
  }
  return configSavePromise
    .then(function(flowRevision) {
      activeConfig = {
        flows:config,
        rev:flowRevision
      }
      activeFlowConfig = newFlowConfig
      if (started) {
        return stopFlows().then(function() {
          context.clean(activeFlowConfig)
          start(type)
          return flowRevision
        }).catch(function(err) {
          console.log(err)
        })
      }
    })
}

function getNode(id) {
  var node
  if (activeNodesToFlow[id] && activeFlows[activeNodesToFlow[id]]) {
    return activeFlows[activeNodesToFlow[id]].getNode(id)
  }
  for (var flowId in activeFlows) {
    if (activeFlows.hasOwnProperty(flowId)) {
      node = activeFlows[flowId].getNode(id)
      if (node) {
        return node
      }
    }
  }
  return null
}

function eachNode(cb) {
  for (var id in activeFlowConfig.allNodes) {
    if (activeFlowConfig.allNodes.hasOwnProperty(id)) {
      cb(activeFlowConfig.allNodes[id])
    }
  }
}

function getFlows() {
  return activeConfig
}

function delegateError(node,logMessage,msg) {
  if (activeFlows[node.z]) {
    activeFlows[node.z].handleError(node,logMessage,msg)
  } else if (activeNodesToFlow[node.z]) {
    activeFlows[activeNodesToFlow[node.z]].handleError(node,logMessage,msg)
  } else if (activeFlowConfig.subflows[node.z]) {
    subflowInstanceNodeMap[node.id].forEach(function(n) {
      delegateError(getNode(n),logMessage,msg)
    })
  }
}
function handleError(node,logMessage,msg) {
  if (node.z) {
    delegateError(node,logMessage,msg)
  } else {
    if (activeFlowConfig.configs[node.id]) {
      activeFlowConfig.configs[node.id]._users.forEach(function(id) {
        var userNode = activeFlowConfig.allNodes[id]
        delegateError(userNode,logMessage,msg)
      })
    }
  }
}

function delegateStatus(node,statusMessage) {
  if (activeFlows[node.z]) {
    activeFlows[node.z].handleStatus(node,statusMessage)
  } else if (activeNodesToFlow[node.z]) {
    activeFlows[activeNodesToFlow[node.z]].handleStatus(node,statusMessage)
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


function start(type = 'full') {
  started = true
  log.info('starting flows')
  var id
  if (!activeFlows['global']) {
    activeFlows['global'] = Flow.create(activeFlowConfig)
  }
  for (id in activeFlowConfig.flows) {
    if (activeFlowConfig.flows.hasOwnProperty(id)) {
      if (!activeFlows[id]) {
        activeFlows[id] = Flow.create(activeFlowConfig,activeFlowConfig.flows[id])
      }
    }
  }
  for (id in activeFlows) {
    if (activeFlows.hasOwnProperty(id)) {
      activeFlows[id].start(null)
      var activeNodes = activeFlows[id].getActiveNodes()
      Object.keys(activeNodes).forEach(function(nid) {
        activeNodesToFlow[nid] = id
        if (activeNodes[nid]._alias) {
          subflowInstanceNodeMap[activeNodes[nid]._alias] = subflowInstanceNodeMap[activeNodes[nid]._alias] || []
          subflowInstanceNodeMap[activeNodes[nid]._alias].push(nid)
        }
      })

    }
  }
  events.emit('nodes-started')
  log.info('flows started')
  return when.resolve()
}

/**
 * Stops the current flow configuration
 * @return a promise for the stopping of the flow
 */
function stopFlows() {
  log.info(`stopping flows`)
  started = false
  var promises = []
  var stopList
  for (var id in activeFlows) {
    if (activeFlows.hasOwnProperty(id)) {
      promises = promises.concat(activeFlows[id].stop(stopList))
      delete activeFlows[id]
    }
  }
  return when.promise(function(resolve,reject) {
    when.settle(promises).then(function() {
      for (id in activeNodesToFlow) {
        if (activeNodesToFlow.hasOwnProperty(id)) {
          if (!activeFlows[activeNodesToFlow[id]]) {
            delete activeNodesToFlow[id]
          }
        }
      }
      if (stopList) {
        stopList.forEach(function(id) {
          delete activeNodesToFlow[id]
        })
      }
      subflowInstanceNodeMap = {}
      log.info('flows stopped')
      resolve()
    })
  })
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
  handleError,
  handleStatus,
  disableFlow: null,
  enableFlow: null,
}
