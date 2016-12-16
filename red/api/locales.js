const i18n = require('../i18n')

module.exports = function(req, res) {
  var namespace = req.params[0]
  namespace = namespace.replace(/\.json$/,'')
  const catalog = i18n.catalog(namespace, 'en-US')
  res.json(catalog || {})
}
