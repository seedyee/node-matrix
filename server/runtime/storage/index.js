const fs = require('fs-extra')
const when = require('when')
const nodeFn = require('when/node/function')
const fspath = require('path')
const settings = require('../../../settings')
const log = require('../log')

const libDir = fspath.join(settings.dataDir, 'lib')
const libFlowsDir = fspath.join(libDir, 'flows')

fs.mkdirpSync(libFlowsDir)
const promiseMkdir = nodeFn.lift(fs.mkdirp)

function writeFile(path,content) {
  return when.promise(function(resolve,reject) {
    var stream = fs.createWriteStream(path)
    stream.on('open',function(fd) {
      stream.end(content,'utf8',function() {
        fs.fsync(fd,resolve)
      })
    })
    stream.on('error',function(err) {
      reject(err)
    })
  })
}

const localfilesystem = {
  getFlows: function() {
    return when.promise(function(resolve) {
      fs.readFile(settings.flowsFile, 'utf8', function(err,data) {
        err? resolve([]) : resolve(JSON.parse(data))
      })
    })
  },

  saveFlows: function(flows) {
    // flowData = JSON.stringify(flows)
    //flowFilePretty
    const flowData = JSON.stringify(flows, null, 4)
    return writeFile(settings.flowsFile, flowData)
  },

  getLibEntry: function(libName) {
    const path = fspath.join(libFlowsDir, libName)
    console.log(path)
    return fs.readFileSync(path, 'utf8')
  },

  getAllLibs: function() {
    const files = fs.readdirSync(libFlowsDir)
    return { f: files }
  },

  // type: 'folows' | 'function' | 'template'
  // path can be tested path --> dir/subdir/name
  saveLibraryEntry: function(path, libContenct) {
    const file = fspath.join(libFlowsDir, path)
    return promiseMkdir(fspath.dirname(file)).then(function () {
      writeFile(file, libContenct)
    })
  }
}

module.exports = localfilesystem
