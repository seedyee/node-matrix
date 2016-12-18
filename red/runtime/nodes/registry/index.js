// const registry = require('./registry')
const loader = require('./loader')

module.exports = {
  init: loader.init,
  load: loader.load,
  // registerType: registry.registerNodeConstructor,
  registerType: loader.registerNodeConstructor,
  // get: registry.getNodeConstructor,
  get: loader.getNodeConstructor,
  getNodeList: loader.getNodeList,
  getNodeConfigs: loader.getAllNodeConfigs,
}
