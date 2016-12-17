const when = require('when')
const clone = require('clone')
const assert = require('assert')
const log = require('./log')
const userSettings = require('../../settings')

var globalSettings = null
var storage = null

var persistentSettings = {
  init: function() {
    for (var i in userSettings) {
      /* istanbul ignore else */
      if (userSettings.hasOwnProperty(i) && i !== 'load' && i !== 'get' && i !== 'set' && i !== 'reset') {
        // Don't allow any of the core functions get replaced via settings
        (function() {
          var j = i
          persistentSettings.__defineGetter__(j,function() { return userSettings[j] })
          persistentSettings.__defineSetter__(j,function() { throw new Error(`Property ${j} is read only`) })
        })()
      }
    }
    globalSettings = null
  },
  load: function(_storage) {
    storage = _storage
    return storage.getSettings().then(function(_settings) {
      globalSettings = _settings
    })
  },
  get: function(prop) {
    if (userSettings.hasOwnProperty(prop)) {
      return clone(userSettings[prop])
    }
    if (globalSettings === null) {
      throw new Error('settings.not-available')
    }
    return clone(globalSettings[prop])
  },
}

module.exports = persistentSettings

