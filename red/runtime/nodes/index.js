const registry = require('./registry')
const flows = require('./flows')
const context = require('./context')
const Node = require('./Node')

/**
 * Called from a Node's constructor function, invokes the super-class
 * constructor and attaches any credentials to the node.
 * @param node the node object being created
 * @param def the instance definition for the node
 */
function createNode(node, def) {
  Node.call(node, def)
  let id = node.id
  if (def._alias) {
    id = def._alias
  }
}

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

  addFlow:     flows.addFlow,
  getFlow:     flows.getFlow,
  updateFlow:  flows.updateFlow,
  removeFlow:  flows.removeFlow,
}
