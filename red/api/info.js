const theme = require('./theme')
const util = require('util')
var runtime
var settings

module.exports = {
  init: function(_runtime) {
    runtime = _runtime
    settings = runtime.settings
  },
  settings: function(req,res) {
    var safeSettings = {
      httpNodeRoot: settings.httpNodeRoot,
      version: settings.version,
      user: req.user
    }

    var themeSettings = theme.settings()
    if (themeSettings) {
      safeSettings.editorTheme = themeSettings
    }

    if (util.isArray(settings.paletteCategories)) {
      safeSettings.paletteCategories = settings.paletteCategories
    }

    if (settings.flowFilePretty) {
      safeSettings.flowFilePretty = settings.flowFilePretty
    }
    res.json(safeSettings)
  }
}
