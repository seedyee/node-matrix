const util = require('util')
const when = require('when')
const events = require('../../events')

var Node
var moduleConfigs = {}
var nodeConstructors = {}

function addNodeSet(set) {
  const { module, name } = set
  moduleConfigs[module].nodes[name] = set
}

function getModule(id) {
  const parts = id.split('/')
  return parts.slice(0, parts.length-1).join('/')
}

function getNode(id) {
  const parts = id.split('/')
  return parts[parts.length - 1]
}

function init(_settings) {
  nodeConstructors = {}
  Node = require('../Node')
}

function load(nodeFiles) {
  moduleConfigs = nodeFiles
}

function registerNodeConstructor(nodeSet, type, constructor) {
  if (nodeConstructors.hasOwnProperty(type)) {
    throw new Error(type+' already registered')
  }
  if(!(constructor.prototype instanceof Node)) {
    util.inherits(constructor, Node)
  }
  const module = moduleConfigs[getModule(nodeSet)]
  const nodeSetInfo =  module.nodes[getNode(nodeSet)]
  if (nodeSetInfo.types.indexOf(type) === -1) {
    // A type is being registered for a known set, but for some reason
    // we didn't spot it when parsing the HTML file.
    // Registered a type is the definitive action - not the presence
    // of an edit template. Ensure it is on the list of known types.
    nodeSetInfo.types.push(type)
  }

  nodeConstructors[type] = constructor
  events.emit('type-registered', type)
}

function getNodeConstructor(type) {
  return nodeConstructors[type]
}

const registry = module.exports = {
  init: init,
  load: load,
  registerNodeConstructor: registerNodeConstructor,
  getNodeConstructor: getNodeConstructor,
  addNodeSet: addNodeSet,
}
