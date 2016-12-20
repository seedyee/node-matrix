const storageModule = require('./localfilesystem')

const { init, getSettings, saveSettings, getLibraryEntry, getLibEntry, getAllLibs, getFlows, saveFlows } = storageModule
const storageModuleInterface = {
  init,
  getFlows,
  saveFlows,
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
