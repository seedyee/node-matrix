const fs = require('fs')
const path = require('path')

var i18n
var supportedLangs = []

var apiLocalDir = path.resolve(path.join(__dirname,'locales'))

var initSupportedLangs = function() {
  fs.readdir(apiLocalDir, function(err,files) {
    if(!err) {
      supportedLangs = files
    }
  })
}

function determineLangFromHeaders(acceptedLanguages){
  var lang = i18n.defaultLang
  acceptedLanguages = acceptedLanguages || []
  for (var i=0; i<acceptedLanguages.length; i++){
    if (supportedLangs.indexOf(acceptedLanguages[i]) !== -1){
      lang = acceptedLanguages[i]
      break
      // check the language without the country code
    } else if (supportedLangs.indexOf(acceptedLanguages[i].split('-')[0]) !== -1) {
      lang = acceptedLanguages[i].split('-')[0]
      break
    }
  }
  return lang
}

module.exports = {
  init: function(runtime) {
    i18n = runtime.i18n
    initSupportedLangs()
  },
  get: function(req,res) {
    var namespace = req.params[0]
    namespace = namespace.replace(/\.json$/,'')
    var lang = determineLangFromHeaders(req.acceptsLanguages() || [])
    var prevLang = i18n.i.lng()
    i18n.i.setLng(lang, function(){
      var catalog = i18n.catalog(namespace,lang)
      res.json(catalog||{})
    })
    i18n.i.setLng(prevLang)
  },
  determineLangFromHeaders: determineLangFromHeaders
}
