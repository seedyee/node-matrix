const registry = require('./registry')
const loader = require('./loader')

module.exports = {
  init: loader.init,
  load: loader.load,
  registerType: registry.registerNodeConstructor,
  get: registry.getNodeConstructor,
  getNodeList: loader.getNodeList,
  getNodeConfigs: loader.getAllNodeConfigs,
}
