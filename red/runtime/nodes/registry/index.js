const when = require('when')
const path = require('path')

const registry = require('./registry')
const loader = require('./loader')

function init(runtime) {
  loader.init(runtime)
  registry.init(runtime.settings, loader)
}

function load() {
  registry.load()
  loader.load()
  return when.resolve()
}

module.exports = {
  init:init,
  load:load,
  registerType: registry.registerNodeConstructor,
  get: registry.getNodeConstructor,
  getNodeList: registry.getNodeList,
  getNodeConfigs: registry.getAllNodeConfigs,
  getNodeConfig: registry.getNodeConfig,
}
