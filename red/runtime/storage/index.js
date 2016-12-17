const storageModule = require('./localfilesystem')

const { init, getSettings, saveSettings, getLibraryEntry, getLibEntry, getAllLibs } = storageModule
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
  getLibEntry,
  getAllLibs,
}

module.exports = storageModuleInterface
