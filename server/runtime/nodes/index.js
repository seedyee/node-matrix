const registry = require('./registry')
const flows = require('./flows')
const context = require('./context')
const { createNode } = require('./Node')

function init(runtime) {
  flows.init(runtime)
  registry.init(runtime)
  context.init()
}

module.exports = {
  // Lifecycle
  init: init,
  load: registry.load,

  // Node registry
  createNode: createNode,
  getNode: flows.get,
  eachNode: flows.eachNode,

  // Node type registry
  registerType: registry.registerType,
  // getType: registry.getType,

  getNodeList: registry.getNodeList,
  getAllNodeConfigs: registry.getAllNodeConfigs,

  // Flow handling
  loadFlows:  flows.load,
  startFlows: flows.startFlows,
  stopFlows:  flows.stopFlows,
  setFlows:   flows.setFlows,
  getFlows:   flows.getFlows,
}
