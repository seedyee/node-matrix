const fs = require('fs')
const path = require('path')
const forOwn = require('lodash/forOwn')
const util = require('util')
const events = require('../events')

const dotsPathMap = require('../../dotsLoader')

let Node
let runtime
const nodeList = []
let allNodeConfigs
const nodeConfigs = []
let nodeConstructors = {}


function init(_runtime) {
  runtime = _runtime
  nodeConstructors = {}
  Node = require('./Node')
}

forOwn(dotsPathMap, (dotPath, dotName) => {
  nodeConfigs.push(createDotConfig(dotPath, dotName))
})

function load() {
  nodeConfigs.forEach(node => {
    const { name, module, id, types, version } = node
    nodeList.push({id, name, types, version, module })
    allNodeConfigs += node.mainContent
    allNodeConfigs += node.helpContent
    const red = createNodeApi(node.id)
    require(node.file)(red)
  })
}

function createDotConfig(dotPath, dotName) {
  // const parts = dotPath.split('/')
  // const name = parts[parts.length -1].replace(/^\d+\-/, '')
  const module = 'node-red'
  const id = `${module}/${dotName}`
  const template = dotPath + '.html'
  const node = {
    id,
    name: dotName,
    module,
    file: dotPath + '.js',
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
  const nodeSetInfo = nodeConfigs.filter(node => node.name === getNode(nodeSet))[0]
  if (nodeSetInfo.types.indexOf(type) === -1) {
    nodeSetInfo.types.push(type)
  }

  nodeConstructors[type] = constructor
  events.emit('type-registered', type)
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
  getType: function (type) { return nodeConstructors[type] },
  getNodeList: function() { return nodeList },
  getAllNodeConfigs: function() { return allNodeConfigs },
}
