const router = require('express').Router()
storage = require('../storage')

// Library
router.get('/flows/*', getFlow)
router.get('/flows', getAll)
router.post('/flows/*', saveFlow)


function getFlow(req, res) {
  const data = storage.getLibEntry(req.params[0])
  res.json(data)
}

function getAll(req, res) {
  const libs = storage.getAllLibs()
  res.json(libs)
}

function saveFlow(req, res) {
  var libContenct = JSON.stringify(req.body)
  storage.saveLibraryEntry(req.params[0], libContenct).then(function() {
    res.status(204).end()
  }).otherwise(function(err) {
    if (err.code === 'forbidden') {
      res.status(403).end()
      return
    }
    res.status(500).send({error:'unexpected_error', message:err.toString()})
  })
}

module.exports = {
  // todo : remove register and it's deps
  // fake register api for backword compatibility
  register: function() {},

  router,
}
