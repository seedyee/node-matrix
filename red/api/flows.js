let log
let redNodes

module.exports = {
  init: function(runtime) {
    redNodes = runtime.nodes
    log = runtime.log
  },

  get: function(req, res) {
    res.json(redNodes.getFlows())
  },
  post: function(req, res) {
    const flows = req.body
    redNodes.setFlows(flows.flows).then(function(flowId) {
      res.json({ rev: flowId })
    }).catch(function(err) {
      log.warn(`api.flows.error-save ${err.message}`)
      log.warn(err.stack)
      res.status(500).json({error: 'unexpected_error', message: err.message})
    })
  }
}
