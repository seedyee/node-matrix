const fs = require('fs')
const path = require('path')
const express = require('express')
const Mustache = require('mustache')

const theme = require('./theme')

const icon_paths = [path.resolve(__dirname + '/../../public/icons')]
const iconCache = {}
//TODO: create a default icon
const defaultIcon = path.resolve(__dirname + '/../../public/icons/arrow-in.png')
const templatePath = path.resolve(__dirname+'/../../editor/templates/index.mst')
let editorTemplate

function nodeIconDir(dir) {
  icon_paths.push(path.resolve(dir))
}

module.exports = {
  init: function(runtime) {
    editorTemplate = fs.readFileSync(templatePath, 'utf8')
    Mustache.parse(editorTemplate)
    // TODO: this allows init to be called multiple times without
    //       registering multiple instances of the listener.
    //       It isn't.... ideal.
    runtime.events.removeListener('node-icon-dir', nodeIconDir)
    runtime.events.on('node-icon-dir', nodeIconDir)
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
    if (iconCache[req.params.icon]) {
      res.sendFile(iconCache[req.params.icon]) // if not found, express prints this to the console and serves 404
    } else {
      for (var p=0; p<icon_paths.length; p++) {
        var iconPath = path.join(icon_paths[p],req.params.icon)
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
    res.send(Mustache.render(editorTemplate, theme.context()))
  },

  editorResources: express.static(__dirname + '/../../public')
}
