const fs = require('fs-extra')
const when = require('when')
const nodeFn = require('when/node/function')
const fspath = require('path')
const mkdirp = fs.mkdirs
const settings = require('../../../settings')
const log = require('../log')

const libDir = fspath.join(settings.dataDir, 'lib')
const libFlowsDir = fspath.join(libDir, 'flows')
const globalSettingsFile = fspath.join(settings.dataDir, '.config.json')

fs.mkdirpSync(libFlowsDir)

const promiseMkdir = nodeFn.lift(mkdirp)

function getFileBody(root,path) {
  var body = ''
  var fn = fspath.join(root,path)
  var fd = fs.openSync(fn,'r')
  var size = fs.fstatSync(fd).size
  var scanning = true
  var read = 0
  var length = 50
  var remaining = ''
  var buffer = Buffer(length)
  while(read < size) {
    var thisRead = fs.readSync(fd,buffer,0,length)
    read += thisRead
    if (scanning) {
      var data = remaining+buffer.slice(0,thisRead).toString()
      var parts = data.split('\n')
      remaining = parts.splice(-1)[0]
      for (var i=0; i<parts.length; i+=1) {
        if (! /^\/\/ \w+: /.test(parts[i])) {
          scanning = false
          body += parts[i]+'\n'
        }
      }
      if (! /^\/\/ \w+: /.test(remaining)) {
        scanning = false
      }
      if (!scanning) {
        body += remaining
      }
    } else {
      body += buffer.slice(0,thisRead).toString()
    }
  }
  fs.closeSync(fd)
  return body
}

/**
 * Write content to a file using UTF8 encoding.
 * This forces a fsync before completing to ensure
 * the write hits disk.
 */
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
    //flowFilePretty
    // flowData = JSON.stringify(flows,null,4)
    const flowData = JSON.stringify(flows)
    return writeFile(settings.flowsFile, flowData)
  },

  getLibEntry: function(path) {
    return getFileBody(libFlowsDir, path)
  },

  getAllLibs: function() {
    const files = fs.readdirSync(libFlowsDir)
    return { f: files }
  },
  // type: 'folows' | 'function' | 'template'
  // path can be tested path --> dir/subdir/name
  saveLibraryEntry: function(type, path, meta, body) {
    const file = fspath.join(libDir, type, path)
    return promiseMkdir(fspath.dirname(file)).then(function () {
      writeFile(file, body)
    })
  }
}

module.exports = localfilesystem
