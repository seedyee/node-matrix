const clone = require('clone')
const when = require('when')
const util = require('../utils/redUtils')

function createContext(id, seed) {
  var data = seed || {}
  var obj = seed || {}
  obj.get = function get(key) {
    return util.getMessageProperty(data, key)
  }
  obj.set = function set(key, value) {
    util.setMessageProperty(data, key, value)
  }
  return obj
}

var contexts = {}
var globalContext = null

function getContext(localId, flowId) {
  const contextId = localId
  if (flowId) {
    contextId = `${localId}:${flowId}`
  }
  if (contexts.hasOwnProperty(contextId)) {
    return contexts[contextId]
  }
  var newContext = createContext(contextId)
  if (flowId) {
    newContext.flow = getContext(flowId)
    if (globalContext) {
      newContext.global = globalContext
    }
  }
  contexts[contextId] = newContext
  return newContext
}

function deleteContext(id, flowId) {
  var contextId = id
  if (flowId) {
    contextId = `${id}:${flowId}`
  }
  delete contexts[contextId]
}
function clean(flowConfig) {
  var activeIds = {}
  var contextId
  var node
  for (var id in contexts) {
    if (contexts.hasOwnProperty(id)) {
      var idParts = id.split(':')
      if (!flowConfig.allNodes.hasOwnProperty(idParts[0])) {
        delete contexts[id]
      }
    }
  }
}
module.exports = {
  init: function() {
    globalContext = createContext('global', {})
  },
  get: getContext,
  delete: deleteContext,
  clean:clean,
}
