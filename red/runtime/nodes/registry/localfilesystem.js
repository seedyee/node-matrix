const when = require('when')
const fs = require('fs')
const path = require('path')

let events
let log
let i18n
let settings

function init(runtime) {
  settings = runtime.settings
  events = runtime.events
  log = runtime.log
}

function getNodeFiles() {
  // Find all of the nodes to load
  const { nodesDirList } = settings
  // map and then flatten
  const nodeFiles = nodesDirList.map(getLocalNodeFiles).reduce((a, b) => a.concat(b), [])
  const nodeList = {
    'node-red': {
      name: 'node-red',
      version: settings.version,
      nodes: {},
    }
  }
  nodeFiles.forEach(function(node) {
    nodeList['node-red'].nodes[node.name] = node
  })
  return nodeList
}

function getLocalNodeFiles(dir) {
  let result = []
  let files = []
  try {
    files = fs.readdirSync(dir).sort()
  } catch(err) {
    console.log(err)
    throw err
  }

  files.forEach(function(fn) {
    const stats = fs.statSync(path.join(dir,fn))
    if (stats.isFile()) {
      if (/\.js$/.test(fn)) {
        const info = getLocalFile(path.join(dir, fn))
        result.push(info)
      }
    } else if (stats.isDirectory()) {
      // Ignore /.dirs/, /lib/ /node_modules/
      if (!/^(\..*|lib|icons|node_modules|test|locales)$/.test(fn)) {
        result = result.concat(getLocalNodeFiles(path.join(dir,fn)))
      }
    }
  })
  return result
}

function getLocalFile(file) {
  try {
    fs.statSync(file.replace(/\.js$/, '.html'))
  } catch(err) {
    console.log(err)
    throw err
  }
  return {
    file: file,
    module: 'node-red',
    name: path.basename(file).replace(/^\d+-/, '').replace(/\.js$/, ''),
    version: settings.version,
  }
}

module.exports = {
  init,
  getNodeFiles,
}
