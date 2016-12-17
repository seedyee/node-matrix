const storageModule = require('./localfilesystem')

const storageModuleInterface = {
  init: function(runtime) {
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
    return storageModule.getLibraryEntry(type, path)
  },
  saveLibraryEntry: function(type, path, meta, body) {
    return storageModule.saveLibraryEntry(type, path, meta, body)
  },
  getFlow: function(fn) {
    if (storageModule.hasOwnProperty('getFlow')) {
      return storageModule.getFlow(fn)
    } else {
      return storageModule.getLibraryEntry('flows',fn)
    }
  },
  saveFlow: function(fn, data) {
    if (storageModule.hasOwnProperty('saveFlow')) {
      return storageModule.saveFlow(fn, data)
    } else {
      return storageModule.saveLibraryEntry('flows',fn,{},data)
    }
  },
  /* End deprecated functions */
  getAllFlows: listFlows
}

function listFlows(path) {
  return storageModule.getLibraryEntry('flows', path).then(function(res) {
    return { f: Object.values(res).map(i => i.fn) }
  })
}

module.exports = storageModuleInterface
