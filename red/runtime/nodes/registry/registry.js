const util = require('util')
const when = require('when')
const events = require('../../events')

var settings
var Node
var loader

var moduleConfigs = {}
var nodeList = []
var nodeConstructors = {}
var nodeTypeToId = {}

function addNodeSet(set) {
  const { id, version } = set
  moduleConfigs[set.module].local = set.local
  moduleConfigs[set.module].nodes[set.name] = set
  nodeList.push(id)
}

function getModule(id) {
  const parts = id.split('/')
  return parts.slice(0, parts.length-1).join('/')
}

function getNode(id) {
  const parts = id.split('/')
  return parts[parts.length - 1]
}

function init(_settings, _loader) {
  settings = _settings
  loader = _loader
  nodeTypeToId = {}
  nodeConstructors = {}
  nodeList = []
  Node = require('../Node')
}

function load(nodeFiles) {
  moduleConfigs = nodeFiles
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

function registerNodeConstructor(nodeSet, type, constructor) {
  if (nodeConstructors.hasOwnProperty(type)) {
    throw new Error(type+' already registered')
  }
  if(!(constructor.prototype instanceof Node)) {
    inheritNode(constructor)
  }

  let nodeSetInfo
  const module = moduleConfigs[getModule(nodeSet)]
  nodeSetInfo =  module.nodes[getNode(nodeSet)]
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
  events.emit('type-registered', type)
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
}
