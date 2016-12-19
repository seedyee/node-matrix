const clone = require('clone')
const when = require('when')

const Flow = require('./Flow')
const typeRegistry = require('../registry')
const context = require('../context')
const flowUtil = require('./util')
const log = require('../../log')
const events = require('../../events')
const redUtil = require('../../util')

var storage = null

var activeConfig = null
var activeFlowConfig = null

var activeFlows = {}
var started = false

var activeNodesToFlow = {}
var subflowInstanceNodeMap = {}

var typeEventRegistered = false

function init(runtime) {
  if (started) {
    throw new Error('Cannot init without a stop')
  }
  storage = runtime.storage
  started = false
  if (!typeEventRegistered) {
    events.on('type-registered', function(type) {
      if (activeFlowConfig && activeFlowConfig.missingTypes.length > 0) {
        var i = activeFlowConfig.missingTypes.indexOf(type)
        if (i != -1) {
          log.info(log._('nodes.flows.registered-missing', {type:type}))
          activeFlowConfig.missingTypes.splice(i,1)
          if (activeFlowConfig.missingTypes.length === 0 && started) {
            start()
          }
        }
      }
    })
    typeEventRegistered = true
  }
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
  return setFlows(null, 'load', false)
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
    console.log(type)
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

function updateMissingTypes() {
  var subflowInstanceRE = /^subflow:(.+)$/
  activeFlowConfig.missingTypes = []

  for (var id in activeFlowConfig.allNodes) {
    if (activeFlowConfig.allNodes.hasOwnProperty(id)) {
      var node = activeFlowConfig.allNodes[id]
      if (node.type !== 'tab' && node.type !== 'subflow') {
        var subflowDetails = subflowInstanceRE.exec(node.type)
        if ( (subflowDetails && !activeFlowConfig.subflows[subflowDetails[1]]) || (!subflowDetails && !typeRegistry.get(node.type)) ) {
          if (activeFlowConfig.missingTypes.indexOf(node.type) === -1) {
            activeFlowConfig.missingTypes.push(node.type)
          }
        }
      }
    }
  }
}

function addFlow(flow) {
  var i,node
  if (!flow.hasOwnProperty('nodes')) {
    throw new Error('missing nodes property')
  }
  flow.id = redUtil.generateId()

  var nodes = [{
    type:'tab',
    label:flow.label,
    id:flow.id
  }]

  for (i=0; i<flow.nodes.length; i++) {
    node = flow.nodes[i]
    if (activeFlowConfig.allNodes[node.id]) {
      // TODO nls
      return when.reject(new Error('duplicate id'))
    }
    if (node.type === 'tab' || node.type === 'subflow') {
      return when.reject(new Error('invalid node type: '+node.type))
    }
    node.z = flow.id
    nodes.push(node)
  }
  if (flow.configs) {
    for (i=0; i<flow.configs.length; i++) {
      node = flow.configs[i]
      if (activeFlowConfig.allNodes[node.id]) {
        // TODO nls
        return when.reject(new Error('duplicate id'))
      }
      if (node.type === 'tab' || node.type === 'subflow') {
        return when.reject(new Error('invalid node type: '+node.type))
      }
      node.z = flow.id
      nodes.push(node)
    }
  }
  var newConfig = clone(activeConfig.flows)
  newConfig = newConfig.concat(nodes)

  return setFlows(newConfig,'flows',true).then(function() {
    return flow.id
  })
}

function getFlow(id) {
  var flow
  if (id === 'global') {
    flow = activeFlowConfig
  } else {
    flow = activeFlowConfig.flows[id]
  }
  if (!flow) {
    return null
  }
  var result = {
    id: id
  }
  if (flow.label) {
    result.label = flow.label
  }
  if (id !== 'global') {
    result.nodes = []
  }
  if (flow.nodes) {
    var nodeIds = Object.keys(flow.nodes)
    if (nodeIds.length > 0) {
      result.nodes = nodeIds.map(function(nodeId) {
        var node = clone(flow.nodes[nodeId])
        if (node.type === 'link out') {
          delete node.wires
        }
        return node
      })
    }
  }
  if (flow.configs) {
    var configIds = Object.keys(flow.configs)
    result.configs = configIds.map(function(configId) {
      return clone(flow.configs[configId])
    })
    if (result.configs.length === 0) {
      delete result.configs
    }
  }
  if (flow.subflows) {
    var subflowIds = Object.keys(flow.subflows)
    result.subflows = subflowIds.map(function(subflowId) {
      var subflow = clone(flow.subflows[subflowId])
      var nodeIds = Object.keys(subflow.nodes)
      subflow.nodes = nodeIds.map(function(id) {
        return subflow.nodes[id]
      })
      if (subflow.configs) {
        var configIds = Object.keys(subflow.configs)
        subflow.configs = configIds.map(function(id) {
          return subflow.configs[id]
        })
      }
      delete subflow.instances
      return subflow
    })
    if (result.subflows.length === 0) {
      delete result.subflows
    }
  }
  return result
}

function updateFlow(id,newFlow) {
  var label = id
  if (id !== 'global') {
    if (!activeFlowConfig.flows[id]) {
      var e = new Error()
      e.code = 404
      throw e
    }
    label = activeFlowConfig.flows[id].label
  }
  var newConfig = clone(activeConfig.flows)
  var nodes

  if (id === 'global') {
    // Remove all nodes whose z is not a known flow
    // When subflows can be owned by a flow, this logic will have to take
    // that into account
    newConfig = newConfig.filter(function(node) {
      return node.type === 'tab' || (node.hasOwnProperty('z') && activeFlowConfig.flows.hasOwnProperty(node.z))
    })

    // Add in the new config nodes
    nodes = newFlow.configs||[]
    if (newFlow.subflows) {
      // Add in the new subflows
      newFlow.subflows.forEach(function(sf) {
        nodes = nodes.concat(sf.nodes||[]).concat(sf.configs||[])
        delete sf.nodes
        delete sf.configs
        nodes.push(sf)
      })
    }
  } else {
    newConfig = newConfig.filter(function(node) {
      return node.z !== id && node.id !== id
    })
    var tabNode = {
      type:'tab',
      label:newFlow.label,
      id:id
    }
    nodes = [tabNode].concat(newFlow.nodes||[]).concat(newFlow.configs||[])
    nodes.forEach(function(n) {
      n.z = id
    })
  }

  newConfig = newConfig.concat(nodes)
  return setFlows(newConfig,'flows',true).then(function() {
    log.info(log._('nodes.flows.updated-flow',{label:(label?label+' ':'')+'['+id+']'}))
  })
}

function removeFlow(id) {
  if (id === 'global') {
    // TODO: nls + error code
    throw new Error('not allowed to remove global')
  }
  var flow = activeFlowConfig.flows[id]
  if (!flow) {
    var e = new Error()
    e.code = 404
    throw e
  }

  var newConfig = clone(activeConfig.flows)
  newConfig = newConfig.filter(function(node) {
    return node.z !== id && node.id !== id
  })

  return setFlows(newConfig,'flows',true).then(function() {
    log.info(log._('nodes.flows.removed-flow',{label:(flow.label?flow.label+' ':'')+'['+flow.id+']'}))
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
  addFlow,
  getFlow,
  updateFlow,
  removeFlow,
  disableFlow: null,
  enableFlow: null,
}
