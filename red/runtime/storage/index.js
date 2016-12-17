const when = require('when')
const Path = require('path')
const crypto = require('crypto')
const log = require('../log')
const storageModule = require('./localfilesystem')

var runtime

function is_malicious(path) {
  return path.indexOf('../') != -1 || path.indexOf('..\\') != -1
}

var storageModuleInterface = {
  init: function(_runtime) {
    runtime = _runtime
    return storageModule.init(runtime.settings)
  },
  getFlows: function() {
    return storageModule.getFlows().then(flows =>({ flows }))
  },
  saveFlows: function(config) {
    return storageModule.saveFlows(config.flows)
  },
  getSettings: function() {
    return storageModule.getSettings()
  },
  saveSettings: function(settings) {
    return storageModule.saveSettings(settings)
  },
  getLibraryEntry: function(type, path) {
    if (is_malicious(path)) {
      var err = new Error()
      err.code = 'forbidden'
      return when.reject(err)
    }
    return storageModule.getLibraryEntry(type, path)
  },
  saveLibraryEntry: function(type, path, meta, body) {
    if (is_malicious(path)) {
      var err = new Error()
      err.code = 'forbidden'
      return when.reject(err)
    }
    return storageModule.saveLibraryEntry(type, path, meta, body)
  },

  /* Deprecated functions */
  getAllFlows: function() {
    if (storageModule.hasOwnProperty('getAllFlows')) {
      return storageModule.getAllFlows()
    } else {
      return listFlows('/')
    }
  },

  getFlow: function(fn) {
    if (is_malicious(fn)) {
      var err = new Error()
      err.code = 'forbidden'
      return when.reject(err)
    }
    if (storageModule.hasOwnProperty('getFlow')) {
      return storageModule.getFlow(fn)
    } else {
      return storageModule.getLibraryEntry('flows',fn)
    }

  },
  saveFlow: function(fn, data) {
    if (is_malicious(fn)) {
      var err = new Error()
      err.code = 'forbidden'
      return when.reject(err)
    }
    if (storageModule.hasOwnProperty('saveFlow')) {
      return storageModule.saveFlow(fn, data)
    } else {
      return storageModule.saveLibraryEntry('flows',fn,{},data)
    }
  }
  /* End deprecated functions */

}


function listFlows(path) {
  return storageModule.getLibraryEntry('flows',path).then(function(res) {
    return when.promise(function(resolve) {
      var promises = []
      res.forEach(function(r) {
        if (typeof r === 'string') {
          promises.push(listFlows(Path.join(path,r)))
        } else {
          promises.push(when.resolve(r))
        }
      })
      var i=0
      when.settle(promises).then(function(res2) {
        var result = {}
        res2.forEach(function(r) {
          // TODO: name||fn
          if (r.value.fn) {
            var name = r.value.name
            if (!name) {
              name = r.value.fn.split('.')[0]
            }
            result.f = result.f || []
            result.f.push(name)
          } else {
            result.d = result.d || {}
            result.d[res[i]] = r.value
            //console.log('>',r.value)
          }
          i++
        })
        resolve(result)
      })
    })
  })
}

module.exports = storageModuleInterface
