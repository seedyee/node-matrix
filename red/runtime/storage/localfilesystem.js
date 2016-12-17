var fs = require('fs-extra')
var when = require('when')
var nodeFn = require('when/node/function')
var keys = require('when/keys')
var fspath = require('path')
var mkdirp = fs.mkdirs
const settings = require('../../../settings')
const log = require('../log')

const libDir = fspath.join(settings.userDir, 'lib')
const libFlowsDir = fspath.join(libDir,'flows')
const globalSettingsFile = fspath.join(settings.userDir, '.config.json')

var promiseDir = nodeFn.lift(mkdirp)

function getFileMeta(root,path) {
  var fn = fspath.join(root,path)
  var fd = fs.openSync(fn,'r')
  var size = fs.fstatSync(fd).size
  var meta = {}
  var read = 0
  var length = 10
  var remaining = ''
  var buffer = Buffer(length)
  while(read < size) {
    read+=fs.readSync(fd,buffer,0,length)
    var data = remaining+buffer.toString()
    var parts = data.split('\n')
    remaining = parts.splice(-1)
    for (var i=0; i<parts.length; i+=1) {
      var match = /^\/\/ (\w+): (.*)/.exec(parts[i])
      if (match) {
        meta[match[1]] = match[2]
      } else {
        read = size
        break
      }
    }
  }
  fs.closeSync(fd)
  return meta
}

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
  init: function() {
    return promiseDir(libFlowsDir)
  },

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

  getSettings: function() {
    return when.promise(function(resolve,reject) {
      fs.readFile(globalSettingsFile, 'utf8', function(err,data) {
        if (!err) {
          try {
            return resolve(JSON.parse(data))
          } catch(err2) {
            log.trace('Corrupted config detected - resetting')
          }
        }
        return resolve({})
      })
    })
  },

  saveSettings: function(settings) {
    if (settings.readOnly) {
      return when.resolve()
    }
    return writeFile(globalSettingsFile,JSON.stringify(settings,null,1))
  },

  getLibEntry: function(path) {
    const flowLibDir = fspath.join(libDir, 'flows')
    return getFileBody(flowLibDir, path)
  },

  getAllLibs: function() {
    const flowLibDir = fspath.join(libDir, 'flows')
    const files = fs.readdirSync(flowLibDir)
    return { f: files }
  },
  // type: 'folows' | 'function' | 'template'
  // path can be tested path --> dir/subdir/name
  saveLibraryEntry: function(type, path, meta, body) {
    const file = fspath.join(libDir, type, path)
    return promiseDir(fspath.dirname(file)).then(function () {
      writeFile(file, body)
    })
  }
}
localfilesystem.getAllLibs()
module.exports = localfilesystem
