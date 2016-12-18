const registry = require('./registry')
const loader = require('./loader')

module.exports = {
  init: loader.init,
  load: loader.load,
  registerType: registry.registerNodeConstructor,
  get: registry.getNodeConstructor,
  // getNodeList: registry.getNodeList,
  getNodeList: loader.getNodeList,
  // getNodeConfigs: registry.getAllNodeConfigs,
  getNodeConfigs: loader.getAllNodeConfigs,
}
