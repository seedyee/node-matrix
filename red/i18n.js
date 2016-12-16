const i18n = require('i18next')
const when = require('when')
const path = require('path')
const fs = require('fs')

const defaultLang = 'en-US'
const resourceMap = {
  'node-red':
    { basedir: '/Users/vimniky/projects/dot-matrix/nodes/core/locales',
      file: 'messages.json',
    },
    editor:
    { basedir: '/Users/vimniky/projects/dot-matrix/red/api/locales',
      file: 'editor.json',
    },
}

let resourceCache = {}

function registerMessageCatalog(namespace, basedir, file) {
  return when.promise(function(resolve, reject) {
    i18n.loadNamespace(namespace, function() {
      resolve()
    })
  })
}

function mergeCatalog(fallback, catalog) {
  for (var k in fallback) {
    if (fallback.hasOwnProperty(k)) {
      if (!catalog[k]) {
        catalog[k] = fallback[k]
      } else if (typeof fallback[k] === 'object') {
        mergeCatalog(fallback[k],catalog[k])
      }
    }
  }
}

const MessageFileLoader = {
  fetchOne: function(lng, ns, callback) {
    if (resourceMap[ns]) {
      var file = path.join(resourceMap[ns].basedir,lng,resourceMap[ns].file)
      console.log(file)
      fs.readFile(file,'utf8',function(err,content) {
        if (err) {
          callback(err)
        } else {
          try {
            resourceCache[ns] = resourceCache[ns]||{}
            resourceCache[ns][lng] = JSON.parse(content.replace(/^\uFEFF/, ''))
            if (lng !== defaultLang) {
              mergeCatalog(resourceCache[ns][defaultLang],resourceCache[ns][lng])
            }
            callback(null, resourceCache[ns][lng])
          } catch(e) {
            callback(e)
          }
        }
      })
    } else {
      callback(new Error('Unrecognised namespace'))
    }
  }

}

function init() {
  return when.promise(function(resolve, reject) {
    i18n.backend(MessageFileLoader)
    i18n.init({
      ns: {
        namespaces: [],
        defaultNs: 'editor'
      },
      fallbackLng: [defaultLang]
    },function() {
      resolve()
    })
  })
}

function getCatalog(namespace, lang) {
  var result = null
  if (resourceCache.hasOwnProperty(namespace)) {
    result = resourceCache[namespace][lang]
    if (!result) {
      var langParts = lang.split('-')
      if (langParts.length == 2) {
        result = resourceCache[namespace][langParts[0]]
      }
      if (!result) {
        return resourceCache[namespace][defaultLang]
      }
    }
  }
  return result
}

const obj = module.exports = {
  init: init,
  registerMessageCatalog: registerMessageCatalog,
  catalog: getCatalog,
  defaultLang: defaultLang,
}

