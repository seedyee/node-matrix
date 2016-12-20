const fs = require('fs')
const path = require('path')
const forOwn = require('lodash/forOwn')
const util = require('util')

const nodesPathMap = require('../../nodesLoader')

let Node
let runtime
const nodeList = []
let allNodeConfigs
const nodeConfigs = []
const nodeConstructorsMap = {}

function init(_runtime) {
  runtime = _runtime
  Node = require('./Node').Node
}

forOwn(nodesPathMap, (nodePath, nodeName) => {
  nodeConfigs.push(createNodeConfig(nodePath, nodeName))
})

function load() {
  nodeConfigs.forEach(node => {
    const { name, module, id, types, version, file } = node
    nodeList.push({id, name, types, version, module })
    allNodeConfigs += node.mainContent
    allNodeConfigs += node.helpContent
    const nodeApi = createNodeApi(id)
    require(file)(nodeApi)
  })
}

function createNodeConfig(nodePath, nodeName) {
  const module = 'node-red'
  // module + nodeName --> id
  const id = `${module}/${nodeName}`
  const template = nodePath + '.html'
  const node = {
    id,
    name: nodeName,
    module,
    file: nodePath + '.js',
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

function getNodeName(id) {
  const parts = id.split('/')
  return parts[parts.length - 1]
}

function registerType(nodeSet, type, constructor) {
  if (nodeConstructorsMap.hasOwnProperty(type)) {
    throw new Error(type+' already registered')
  }
  if(!(constructor.prototype instanceof Node)) {
    util.inherits(constructor, Node)
  }
  const nodeSetInfo = nodeConfigs.filter(node => node.name === getNodeName(nodeSet))[0]
  if (nodeSetInfo.types.indexOf(type) === -1) {
    nodeSetInfo.types.push(type)
  }

  nodeConstructorsMap[type] = constructor
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
    // node.id --> node-api/lower-case, type --> lower-case, constructor: func
    registerType(nodeId, type, constructor)
  }
  const adminApi = runtime.adminApi
  red.comms = adminApi.comms
  red.library = adminApi.library
  red.auth = adminApi.auth
  red.httpAdmin = adminApi.adminApp
  red.httpNode = adminApi.nodeApp
  red.server = adminApi.server

  // todo remove the following line
  red._ = function() {}
  return red
}

module.exports = {
  init,
  load,
  // registerType,
  getType: function (type) { return nodeConstructorsMap[type] },
  getNodeList: function() { return nodeList },
  getAllNodeConfigs: function() { return allNodeConfigs },
}
