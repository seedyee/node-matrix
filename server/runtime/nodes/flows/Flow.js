const when = require('when')
const clone = require('clone')
const typeRegistry = require('../registry')
const Log = require('../../log')
const redUtil = require('../../util')
const flowUtil = require('./util')

function Flow(global,flow) {
  if (typeof flow === 'undefined') {
    flow = global
  }
  var activeNodes = {}
  var catchNodeMap = {}
  var statusNodeMap = {}

  this.start = function() {
    var node
    var newNode
    var id
    catchNodeMap = {}
    statusNodeMap = {}

    var configNodes = Object.keys(flow.configs)
    var configNodeAttempts = {}
    while (configNodes.length > 0) {
      id = configNodes.shift()
      node = flow.configs[id]
      newNode = createNode(node.type,node)
      if (newNode) {
        activeNodes[id] = newNode
      }
    }
    for (id in flow.nodes) {
      node = flow.nodes[id]
      newNode = createNode(node.type,node)
      if (newNode) {
        activeNodes[id] = newNode
      }
    }
  }

  this.stop = function() {
    let stopList = []
    stopList = Object.keys(activeNodes)
    stopList.forEach(id => {
      const node = activeNodes[id]
      if (node) {
        delete activeNodes[id]
      }
      node.close()
    })
  }

  this.update = function(_global,_flow) {
    global = _global
    flow = _flow
  }

  this.getNode = function(id) {
    return activeNodes[id]
  }

  this.getActiveNodes = function() {
    return activeNodes
  }

  this.handleStatus = function(node,statusMessage) {
    var targetStatusNodes = null
    var reportingNode = node
    var handled = false
    while (reportingNode && !handled) {
      targetStatusNodes = statusNodeMap[reportingNode.z]
      if (targetStatusNodes) {
        targetStatusNodes.forEach(function(targetStatusNode) {
          if (targetStatusNode.scope && targetStatusNode.scope.indexOf(node.id) === -1) {
            return
          }
          var message = {
            status: {
              text: "",
              source: {
                id: node.id,
                type: node.type,
                name: node.name
              }
            }
          }
          if (statusMessage.hasOwnProperty("text")) {
            message.status.text = statusMessage.text.toString()
          }
          targetStatusNode.receive(message)
          handled = true
        })
      }
      if (!handled) {
        reportingNode = activeNodes[reportingNode.z]
      }
    }
  }

  // fake handleError
  this.handleError = function() {}
}

function createNode(type,config) {
  var nn = null
  var nt = typeRegistry.getType(type)
  if (nt) {
    var conf = clone(config)
    delete conf.credentials
    for (var p in conf) {
      if (conf.hasOwnProperty(p)) {
        flowUtil.mapEnvVarProperties(conf,p)
      }
    }
    try {
      nn = new nt(conf)
    }
    catch (err) {
      Log.log({
        level: Log.ERROR,
        id:conf.id,
        type: type,
        msg: err
      })
    }
  } else {
    Log.error(`unknow flow type ${type}`)
  }
  return nn
}

module.exports = {
  create: function(global, conf) {
    return new Flow(global, conf)
  }
}
