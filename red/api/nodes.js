let redNodes

module.exports = {
  init: function(runtime) {
    redNodes = runtime.nodes
  },
  getAll: function(req, res) {
    if (req.get('accept') == 'application/json') {
      res.json(redNodes.getNodeList())
    } else {
      res.send(redNodes.getNodeConfigs())
    }
  },
}
