var log
var redNodes
var settings

module.exports = {
  init: function(runtime) {
    settings = runtime.settings
    redNodes = runtime.nodes
    log = runtime.log
  },
  get: function(req, res) {
    const id = req.params.id
    const flow = redNodes.getFlow(id)
    if (flow) {
      log.audit({ event: 'flow.get', id }, req)
      res.json(flow)
    } else {
      log.audit({ event: 'flow.get',id:id,error:'not_found' }, req)
      res.status(404).end()
    }
  },
  post: function(req, res) {
    const flow = req.body
    redNodes.addFlow(flow).then((id) => {
      log.audit({ event: 'flow.add', id }, req)
      res.json({ id })
    }).otherwise(function(err) {
      log.audit({ event: 'flow.add', error: err.code || 'unexpected_error', message: err.toString() }, req)
      res.status(400).json({error:err.code||'unexpected_error', message:err.toString()})
    })
  },

  put: function(req, res) {
    const id = req.params.id
    const flow = req.body
    try {
      redNodes.updateFlow(id,flow).then(function() {
        log.audit({event: 'flow.update',id },req)
        res.json({ id })
      }).otherwise(function(err) {
        log.audit({ event: 'flow.update',error: err.code || 'unexpected_error', message:err.toString() }, req)
        res.status(400).json({ error:err.code || 'unexpected_error', message:err.toString() })
      })
    } catch(err) {
      if (err.code === 404) {
        log.audit({event: 'flow.update',id:id,error:'not_found'},req)
        res.status(404).end()
      } else {
        log.audit({event: 'flow.update',error:err.code||'unexpected_error',message:err.toString()},req)
        res.status(400).json({error:err.code||'unexpected_error', message:err.toString()})
      }
    }
  },

  delete: function(req, res) {
    const id = req.params.id
    try {
      redNodes.removeFlow(id).then(function() {
        log.audit({ event: 'flow.remove', id }, req)
        res.status(204).end()
      })
    } catch(err) {
      if (err.code === 404) {
        log.audit({ event: 'flow.remove',id, error: 'not_found' }, req)
        res.status(404).end()
      } else {
        log.audit({ event: 'flow.remove', id, error: err.code||'unexpected_error', message:err.toString() }, req)
        res.status(400).json({ error: err.code || 'unexpected_error', message:err.toString() })
      }
    }
  }
}
