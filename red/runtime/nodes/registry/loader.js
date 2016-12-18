const when = require('when')
const fs = require('fs')
const path = require('path')
const semver = require('semver')
const forOwn = require('lodash/forOwn')
const util = require('util')
const events = require('../../events')

const { coreDotsDir } = require('../../../../settings')
// get absolute path relative to coreNodesDir
function p(relativePath, dir = coreDotsDir) {
  return path.join(dir, relativePath)
}

//=======================================================================

const dotsPath = {
  // analysis
  sentiment: p('analysis/72-sentiment'),
  // core
  inject: p('core/20-inject'),
  catch: p('core/25-catch'),
  status: p('core/25-status'),
  debug: p('core/58-debug'),
  link: p('core/60-link'),
  link: p('core/60-link'),
  link: p('core/60-link'),
  link: p('core/60-link'),
  exec: p('core/75-exec'),
  function: p('core/80-function'),
  template: p('core/80-template'),
  delay: p('core/89-delay'),
  trigger: p('core/89-trigger'),
  comment: p('core/90-comment'),
  unknown: p('core/98-unknown'),
  // io
  tls: p('io/05-tls'),
  mqtt: p('io/10-mqtt'),
  httpin: p('io/21-httpin'),
  httprequest: p('io/21-httprequest'),
  websocket: p('io/22-websocket'),
  watch: p('io/23-watch'),
  tcp: p('io/31-tcpin'),
  udp: p('io/32-udp'),
  // logic
  switch: p('logic/10-switch'),
  change: p('logic/15-change'),
  range: p('logic/16-range'),
  split: p('logic/17-split'),
  // parsers
  CSV: p('parsers/70-CSV'),
  HTML: p('parsers/70-HTML'),
  JSON: p('parsers/70-JSON'),
  XML: p('parsers/70-XML'),
  // storage
  tail: p('storage/28-tail'),
  file: p('storage/50-file'),
  // others
  lowercase: p('others/lower-case'),
}
//=======================================================================

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
const nodesMap = createDotFiles(dotsPath)

// console.log('-----------dot', createDotFiles(dotsPath)['node-red'])
function load() {

  const nodeConfigs = []
  forOwn(nodesMap, node => {
    nodeConfigs.push(loadNodeConfig(node))
  })

  nodeConfigs.forEach(node => {
    nodesMap[node.name] = node
    const nodeInfo = createNodeInfo(node)
    nodeList.push(nodeInfo)
    allNodeConfigs += node.config
    allNodeConfigs += getNodeHelp(node, 'en-US')
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

function registerNodeConstructor(nodeSet, type, constructor) {
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

function createNodeInfo(node) {
  const { id, module, name, version, types } = node
  return {
    id: id || `${module}/${name}`,
    name,
    types,
    enabled: true,
    local: false,
    version,
    module,
  }
}

let runtime
function init(_runtime) {
  runtime = _runtime
  // registry.init()
  nodeConstructors = {}
  Node = require('../Node')
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
    version: version,
    local: 'en-US',
  }
  const content = fs.readFileSync(template, 'utf8')
  let regExp = /(<script[^>]* data-help-name=[\s\S]*?<\/script>)/gi
  match = null
  let mainContent = ''
  let helpContent = {}
  let index = 0
  const lang = 'en-US'
  while ((match = regExp.exec(content)) !== null) {
    mainContent += content.substring(index, regExp.lastIndex - match[1].length)
    index = regExp.lastIndex
    const help = content.substring(regExp.lastIndex - match[1].length, regExp.lastIndex)
    helpContent[lang] += help
  }
  mainContent += content.substring(index)
  node.config = mainContent
  node.help = helpContent
  node.namespace = node.module
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

function loadNodeHelp(node, lang) {
  var dir = path.dirname(node.template)
  var base = path.basename(node.template)
  var localePath = path.join(dir,'locales',lang,base)
  try {
    // TODO: make this async
    var content = fs.readFileSync(localePath, 'utf8')
    return content
  } catch(err) {
    return null
  }
}

function getNodeHelp(node, lang) {
  if (!node.help[lang]) {
    var help = loadNodeHelp(node, lang)
    if (help == null) {
      var langParts = lang.split('-')
      if (langParts.length == 2) {
        help = loadNodeHelp(node,langParts[0])
      }
    }
    if (help) {
      node.help[lang] = help
    } else {
      node.help[lang] = 'en-US'
    }
  }
  return node.help[lang]
}

var loader = {
  init: init,
  load: load,
  getNodeHelp: getNodeHelp,
  getNodeList: function() {return nodeList },
  getAllNodeConfigs: function() { return allNodeConfigs },
  registerNodeConstructor: registerNodeConstructor,
  getNodeConstructor: getNodeConstructor,
}

module.exports = loader
