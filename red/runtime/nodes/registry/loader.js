const when = require('when')
const fs = require('fs')
const path = require('path')
const semver = require('semver')
const forOwn = require('lodash/forOwn')
const { coreDotsDir } = require('../../../../settings')

const localfilesystem = require('./localfilesystem')
const registry = require('./registry')

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
}
//=======================================================================

/**
 * Loads the specified node into the runtime
 * @param node a node info object - see loadNodeConfig
 * @return a promise that resolves to an update node info object. The object
 *         has the following properties added:
 *            err: any error encountered whilst loading the node
 *
 */

function load() {
  const nodeFiles = localfilesystem.getNodeFiles()
  return loadNodeFiles(nodeFiles)
}

function loadNodeFiles(nodeFiles) {
  const promises = []
  forOwn(nodeFiles, module => {
    const { nodes } = module
    forOwn(nodes, nodeMeta => {
      try {
        promises.push(loadNodeConfig(nodeMeta))
      } catch(err) {
        console.log(err)
        //
      }
    })
  })

  return when.all(promises).then(nodes => {
    nodes.forEach(node => {
      registry.addNodeSet(node)
    })
    return loadNodeSetList(nodes)
  })
}

function loadNodeSetList(nodes) {
  nodes.forEach(node => {
    const nodeDir = path.dirname(node.file)
    const nodeFn = path.basename(node.file)
    try {
      const nodeFn = require(node.file)
      if (typeof nodeFn !== 'function') throw new Error(`Not function is exported in: ${node.file}`)
      const red = createNodeApi(node)
      nodeFn(red)
      node.enabled = true
      node.loaded = true
    } catch(err) {
      console.log(err)
      node.err = err
    }
  })
}

let runtime
function init(_runtime) {
  runtime = _runtime
  localfilesystem.init(runtime)
}

function loadNodeConfig(nodeMeta) {
  const { file, module, name, version  } = nodeMeta
  const id = `${module}/${name}`
  const template = file.replace(/\.js$/,'.html')
  let isEnabled = true

  return when.promise(function(resolve) {
    const node = {
      id,
      module,
      name,
      file,
      template,
      types: [],
      enabled: isEnabled,
      loaded:false,
      version: version,
      local: nodeMeta.local,
    }

    fs.readFile(template, 'utf8', function(err, content) {
      if (err) {
        node.err = (err.code === 'ENOENT') ? `Error: ${templat} does not exist` : err.toString()
        resolve(node)
      } else {
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
        resolve(node)
      }
    })
  })
}

function createNodeApi(node) {
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
    runtime.nodes.registerType(node.id, type, constructor, opts)
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


function loadNodeHelp(node,lang) {
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

module.exports = {
  init: init,
  load: load,
  getNodeHelp: getNodeHelp,
}
