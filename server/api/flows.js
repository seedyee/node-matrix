const router = require('express').Router()

module.exports = function({ redNodes }) {

  router.get('/', function(req, res) {
    res.json(redNodes.getFlows())
  })

  router.post('/', function(req, res) {
    const flows = req.body
    redNodes.setFlows(flows.flows).then(function(flowId) {
      res.json({ rev: flowId })
    }).catch(function(err) {
      res.status(500).json({error: 'unexpected_error', message: err.message})
    })
  })

  return router
}
