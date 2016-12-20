const router = require('express').Router()

module.exports = function({ redNodes }) {
  router.get('/',function(req, res) {
    if (req.get('accept') == 'application/json') {
      res.json(redNodes.getNodeList())
    } else {
      res.send(redNodes.getAllNodeConfigs())
    }
  })

  return router
}

