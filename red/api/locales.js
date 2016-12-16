const { join } = require('path')

const nodesLocaleFile = join(__dirname, '../../nodes/core/locales/en-US/messages.json')
const editorLocaleFile = join(__dirname, './locales/en-US/editor.json')
const editorText = require(editorLocaleFile)
const nodesText = require(nodesLocaleFile)

module.exports = function(req, res) {
  const namespace = req.params[0]
  console.log(req.params)
  console.log(namespace)
  if (namespace === 'node-red') {
    res.json(nodesText)
  } else if (namespace === 'editor') {
    res.json(editorText)
  } else {
    res.json({})
  }
}
