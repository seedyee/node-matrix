const express = require('express')
const util = require('util')
const path = require('path')
const fs = require('fs')
const clone = require('clone')

const defaultContext = {
  page: {
    title: 'Node-RED',
    favicon: 'favicon.ico',
    tabicon: 'red/images/node-red-icon-black.svg'
  },
  header: {
    title: 'Node-RED',
    image: 'red/images/node-red.png'
  },
  asset: {
    red: (process.env.NODE_ENV == 'development')? 'red/red.js':'red/red.min.js'
  }
}

var theme = null
var themeContext = clone(defaultContext)
var themeSettings = null
var runtime = null

function serveFile(app,baseUrl,file) {
  try {
    var stats = fs.statSync(file)
    var url = baseUrl+path.basename(file)
    //console.log(url,'->',file)
    app.get(url,function(req, res) {
      res.sendFile(file)
    })
    return 'theme'+url
  } catch(err) {
    //TODO: log filenotfound
    return null
  }
}

module.exports = {
  init: function(runtime) {
    var settings = runtime.settings
    themeContext = clone(defaultContext)
    themeContext.version = runtime.version
    themeSettings = null
    theme = settings.editorTheme
  },

  app: function() {
    var i
    var url
    themeSettings = {}

    var themeApp = express()

    if (theme.page) {
      if (theme.page.css) {
        var styles = theme.page.css
        if (!util.isArray(styles)) {
          styles = [styles]
        }
        themeContext.page.css = []

        for (i=0; i<styles.length; i++) {
          url = serveFile(themeApp,'/css/',styles[i])
          if (url) {
            themeContext.page.css.push(url)
          }
        }
      }

      if (theme.page.favicon) {
        url = serveFile(themeApp,'/favicon/',theme.page.favicon)
        if (url) {
          themeContext.page.favicon = url
        }
      }

      if (theme.page.tabicon) {
        url = serveFile(themeApp,'/tabicon/',theme.page.tabicon)
        if (url) {
          themeContext.page.tabicon = url
        }
      }

      themeContext.page.title = theme.page.title || themeContext.page.title
    }

    if (theme.header) {

      themeContext.header.title = theme.header.title || themeContext.header.title

      if (theme.header.hasOwnProperty('url')) {
        themeContext.header.url = theme.header.url
      }

      if (theme.header.hasOwnProperty('image')) {
        if (theme.header.image) {
          url = serveFile(themeApp,'/header/',theme.header.image)
          if (url) {
            themeContext.header.image = url
          }
        } else {
          themeContext.header.image = null
        }
      }
    }

    if (theme.deployButton) {
      if (theme.deployButton.type == 'simple') {
        themeSettings.deployButton = {
          type: 'simple'
        }
        if (theme.deployButton.label) {
          themeSettings.deployButton.label = theme.deployButton.label
        }
        if (theme.deployButton.icon) {
          url = serveFile(themeApp,'/deploy/',theme.deployButton.icon)
          if (url) {
            themeSettings.deployButton.icon = url
          }
        }
      }
    }

    if (theme.hasOwnProperty('userMenu')) {
      themeSettings.userMenu = theme.userMenu
    }

    if (theme.login) {
      if (theme.login.image) {
        url = serveFile(themeApp,'/login/',theme.login.image)
        if (url) {
          themeContext.login = {
            image: url
          }
        }
      }
    }

    if (theme.hasOwnProperty('menu')) {
      themeSettings.menu = theme.menu
    }

    if (theme.hasOwnProperty('palette')) {
      themeSettings.palette = theme.palette
    }
    return themeApp
  },
  context: function() {
    return themeContext
  },
  settings: function() {
    return themeSettings
  }
}
