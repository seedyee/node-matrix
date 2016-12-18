const when = require('when')
const fs = require('fs')
const path = require('path')
const semver = require('semver')
const forOwn = require('lodash/forOwn')
const util = require('util')
const events = require('../events')

const dotsMap = require('../../dotsLoader')

function createDot(path) {
  const parts = path.split('/')
  return {
    module: 'node-red',
    version: '0.15.2',
    file: path + '.js',
    types: [],
    name: parts[parts.length -1].replace(/^\d+\-/, ''),
  }
}

function createDotFiles(paths) {
  const nodes = {}
  forOwn(paths, (value, key) => {
    nodes[key] = createDot(value)
  })
  return nodes
}

const nodeList = []
let allNodeConfigs
const nodesMap = createDotFiles(dotsMap)

function load() {

  const nodeConfigs = []
  forOwn(nodesMap, node => {
    nodeConfigs.push(loadNodeConfig(node))
  })

  nodeConfigs.forEach(node => {
    const { name, module, id, types, version } = node
    nodesMap[node.name] = node
    nodeList.push({id, name, types, version, module })
    allNodeConfigs += node.mainContent
    allNodeConfigs += node.helpContent
    const red = createNodeApi(node.id)
    require(node.file)(red)
  })
}

//======================================================================

var Node
var nodeConstructors = {}

function getNode(id) {
  const parts = id.split('/')
  return parts[parts.length - 1]
}

function registerType(nodeSet, type, constructor) {
  if (nodeConstructors.hasOwnProperty(type)) {
    throw new Error(type+' already registered')
  }
  if(!(constructor.prototype instanceof Node)) {
    util.inherits(constructor, Node)
  }
  const nodeSetInfo = nodesMap[getNode(nodeSet)]
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
//=====================================================================


let runtime
function init(_runtime) {
  runtime = _runtime
  nodeConstructors = {}
  Node = require('./Node')
}

function loadNodeConfig(nodeMeta) {
  const { file, module, name, version  } = nodeMeta
  const id = `${module}/${name}`
  const template = file.replace(/\.js$/,'.html')

  const node = {
    id,
    module,
    name,
    file,
    template,
    types: [],
  }

  const content = fs.readFileSync(template, 'utf8')
  let regExp = /(<script[^>]* data-help-name=[\s\S]*?<\/script>)/gi
  match = null
  let mainContent = ''
  let helpContent = ''
  let index = 0
  while ((match = regExp.exec(content)) !== null) {
    mainContent += content.substring(index, regExp.lastIndex - match[1].length)
    index = regExp.lastIndex
    const help = content.substring(regExp.lastIndex - match[1].length, regExp.lastIndex)
    helpContent += help
  }
  mainContent += content.substring(index)
  node.mainContent = mainContent
  node.helpContent = helpContent
  return node
}

function createNodeApi(nodeId) {
  const {
    createNode,
    getNode,
    eachNode,
  } = runtime.nodes

  const nodesApi = {
    createNode,
    getNode,
    eachNode,
  }
  const logApi = {
    log,
    info,
    warn,
    error,
    trace,
    debug,
  } = runtime.log

  const red = {
    nodes: nodesApi,
    log: logApi,
    settings: {},
    events: runtime.events,
    util: runtime.util,
    version: runtime.version,
  }
  red.nodes.registerType = function(type, constructor, opts) {
    // node.id --> node-red/lower-case, type --> lower-case, constructor: func
    runtime.nodes.registerType(nodeId, type, constructor, opts)
  }
  const adminApi = runtime.adminApi
  red.comms = adminApi.comms
  red.library = adminApi.library
  red.auth = adminApi.auth
  red.httpAdmin = adminApi.adminApp
  red.httpNode = adminApi.nodeApp
  red.server = adminApi.server

  // todo remove the following line
  red['_'] = function() {}
  return red
}

module.exports = {
  init: init,
  load: load,
  registerType,
  get: getNodeConstructor,
  getNodeList: function() {return nodeList },
  getNodeConfigs: function() { return allNodeConfigs },
}
