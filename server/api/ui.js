const fs = require('fs')
const path = require('path')
const express = require('express')
const Mustache = require('mustache')

const themeContext = {
  page: {
    title: 'Node-Matrix',
    favicon: 'favicon.ico',
    tabicon: 'red/images/node-red-icon-black.svg'
  },
  header: {
    title: 'Node-Matrix',
    image: 'red/images/node-red.png'
  },
  asset: {
    red: (process.env.NODE_ENV == 'development')? 'red/red.js':'red/red.min.js'
  }
}

const icon_paths = [path.resolve(__dirname + '/../../public/icons')]
const iconCache = {}
//TODO: create a default icon
const defaultIcon = path.resolve(__dirname + '/../../public/icons/arrow-in.png')
const templatePath = path.resolve(__dirname + '/../../editor/templates/index.mst')
let editorTemplate

module.exports = {
  init: function() {
    editorTemplate = fs.readFileSync(templatePath, 'utf8')
    Mustache.parse(editorTemplate)
  },

  ensureSlash: function(req, res, next) {
    const parts = req.originalUrl.split('?')
    if (parts[0].slice(-1) != '/') {
      parts[0] += '/'
      const redirect = parts.join('?')
      res.redirect(301, redirect)
    } else {
      next()
    }
  },
  icon: function(req,res) {
    const iconName = req.params.icon
    if (iconCache[iconName]) {
      res.sendFile(iconCache[iconName])
    } else {
      for (let p=0; p<icon_paths.length; p++) {
        var iconPath = path.join(icon_paths[p],iconName)
        try {
          fs.statSync(iconPath)
          res.sendFile(iconPath)
          iconCache[req.params.icon] = iconPath
          return
        } catch(err) {
          // iconPath doesn't exist
        }
      }
      res.sendFile(defaultIcon)
    }
  },

  editor: function(req, res) {
    res.send(Mustache.render(editorTemplate, themeContext))
  },
  editorResources: express.static(__dirname + '/../../public')
}
