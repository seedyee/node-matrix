const storageModule = require('./localfilesystem')

const { init, getSettings, saveSettings, getLibraryEntry } = storageModule
const storageModuleInterface = {
  init,
  getFlows: function() {
    return storageModule.getFlows().then(flows =>({ flows }))
  },
  saveFlows: function(config) {
    return storageModule.saveFlows(config.flows)
  },
  getSettings,
  saveSettings,
  getLibraryEntry,
  saveLibraryEntry: function(type, path, meta, data) {
    return storageModule.saveLibraryEntry(type, path, meta, data)
  },
  getLibraryEntryList(path) {
    return storageModule.getLibraryEntry('flows', path).then(function(res) {
      return { f: Object.values(res).map(i => i.fn) }
    })
  }
}

module.exports = storageModuleInterface
