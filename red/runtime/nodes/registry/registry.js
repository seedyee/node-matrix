const util = require('util')
const when = require('when')
const events = require('../../events')

var settings
var Node
var loader

var nodeConfigCache = null
var moduleConfigs = {}
var nodeList = []
var nodeConstructors = {}
var nodeTypeToId = {}
var moduleNodes = {}

function addNodeSet(set) {
  const { id, version } = set
  moduleNodes[set.module] = moduleNodes[set.module]||[]
  moduleNodes[set.module].push(set.name)
  moduleConfigs[set.module].local = set.local
  moduleConfigs[set.module].nodes[set.name] = set
  nodeList.push(id)
  nodeConfigCache = null
}

function init(_settings, _loader) {
  settings = _settings
  loader = _loader
  moduleNodes = {}
  nodeTypeToId = {}
  nodeConstructors = {}
  nodeList = []
  nodeConfigCache = null
  Node = require('../Node')
}

function load() {
  moduleConfigs = settings.get('nodes')
}

function filterNodeInfo(n) {
  var r = {
    id: n.id||n.module+'/'+n.name,
    name: n.name,
    types: n.types,
    enabled: n.enabled,
    local: n.local||false,
  }
  if (n.hasOwnProperty('module')) {
    r.module = n.module
  }
  if (n.hasOwnProperty('err')) {
    r.err = n.err.toString()
  }
  return r
}

function getModule(id) {
  const parts = id.split('/')
  return parts.slice(0, parts.length-1).join('/')
}

function getNode(id) {
  const parts = id.split('/')
  return parts[parts.length - 1]
}


function getFullNodeInfo(typeOrId) {
  const module = moduleConfigs[getModule(typeOrId)]
  if (module) {
    return module.nodes[getNode(typeOrId)]
  }
}

function getNodeList(filter) {
  var list = []
  for (var module in moduleConfigs) {
    /* istanbul ignore else */
    if (moduleConfigs.hasOwnProperty(module)) {
      var nodes = moduleConfigs[module].nodes
      for (var node in nodes) {
        /* istanbul ignore else */
        if (nodes.hasOwnProperty(node)) {
          var nodeInfo = filterNodeInfo(nodes[node])
          nodeInfo.version = moduleConfigs[module].version
          if (!filter || filter(nodes[node])) {
            list.push(nodeInfo)
          }
        }
      }
    }
  }
  return list
}

function inheritNode(constructor) {
  if(Object.getPrototypeOf(constructor.prototype) === Object.prototype) {
    util.inherits(constructor,Node)
  } else {
    var proto = constructor.prototype
    while(Object.getPrototypeOf(proto) !== Object.prototype) {
      proto = Object.getPrototypeOf(proto)
    }
    //TODO: This is a partial implementation of util.inherits >= node v5.0.0
    //      which should be changed when support for node < v5.0.0 is dropped
    //      see: https://github.com/nodejs/node/pull/3455
    proto.constructor.super_ = Node
    if(Object.setPrototypeOf) {
      Object.setPrototypeOf(proto, Node.prototype)
    }
  }
}

function registerNodeConstructor(nodeSet,type,constructor) {
  if (nodeConstructors.hasOwnProperty(type)) {
    throw new Error(type+' already registered')
  }
  if(!(constructor.prototype instanceof Node)) {
    inheritNode(constructor)
  }

  const nodeSetInfo = getFullNodeInfo(nodeSet)
  if (nodeSetInfo) {
    if (nodeSetInfo.types.indexOf(type) === -1) {
      // A type is being registered for a known set, but for some reason
      // we didn't spot it when parsing the HTML file.
      // Registered a type is the definitive action - not the presence
      // of an edit template. Ensure it is on the list of known types.
      nodeSetInfo.types.push(type)
    }
  }

  nodeConstructors[type] = constructor
  events.emit('type-registered',type)
}

// @return: string
function getAllNodeConfigs() {
  if (!nodeConfigCache) {
    var result = ''
    var script = ''

    nodeList.forEach(id => {
      var config = moduleConfigs[getModule(id)].nodes[getNode(id)]
      if (config.enabled && !config.err) {
        result += config.config
        result += loader.getNodeHelp(config, 'en-US')
      }
    })
    nodeConfigCache = result
  }
  return nodeConfigCache
}

function getNodeConstructor(type) {
  var id = nodeTypeToId[type]

  var config
  if (typeof id === 'undefined') {
    config = undefined
  } else {
    config = moduleConfigs[getModule(id)].nodes[getNode(id)]
  }

  if (!config || (config.enabled && !config.err)) {
    return nodeConstructors[type]
  }
  return null
}

const registry = module.exports = {
  init: init,
  load: load,

  registerNodeConstructor: registerNodeConstructor,
  getNodeConstructor: getNodeConstructor,

  addNodeSet: addNodeSet,
  getFullNodeInfo: getFullNodeInfo,
  getNodeList: getNodeList,

  /**
   * Gets all of the node template configs
   * @return all of the node templates in a single string
   */
  getAllNodeConfigs,
}
