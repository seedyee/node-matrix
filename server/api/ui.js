const fs = require('fs')
const path = require('path')
const express = require('express')
const router = require('express').Router()
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

editorTemplate = fs.readFileSync(templatePath, 'utf8')
Mustache.parse(editorTemplate)

router.get('/', function(req, res, ensureSlash) {
  res.send(Mustache.render(editorTemplate, themeContext))
})

router.get('/icons:icon', function(req, res) {
  const iconName = req.params.icon
  if (iconCache[iconName]) {
    return res.sendFile(iconCache[iconName])
  }
  for (let p=0; p<icon_paths.length; p++) {
    var iconPath = path.join(icon_paths[p],iconName)
    try {
      fs.statSync(iconPath)
      res.sendFile(iconPath)
      iconCache[req.params.icon] = iconPath
    } catch(err) {
     return  res.status(400).json({error: `can't find icon ${iconName}`})
    }
  }
  res.sendFile(defaultIcon)
})

router.use(express.static(path.join(__dirname, '../../public')))

function ensureSlash(req, res, next) {
  const parts = req.originalUrl.split('?')
  if (parts[0].slice(-1) != '/') {
    parts[0] += '/'
    const redirect = parts.join('?')
    res.redirect(301, redirect)
  } else {
    next()
  }
}

module.exports = router
