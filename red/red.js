const runtime = require('./runtime')
const api = require('./api')
const userSettings = require('../settings')

module.exports = class Dot {
  constructor(httpServer) {
    runtime.init()
    api.init(httpServer, runtime)

    const { adminApp, nodeApp, server, comms, library } = api
    this.adminApp = adminApp
    this.nodeApp = nodeApp
    this.server = server
    this.comms = comms
    this.library = library

    const { nodes, log, settings, util, version } = runtime
    this.log = log
    this.settings = settings
    this.version = version
    this.util = util
    this.nodes = nodes
  }

  start() {
    return runtime.start().then(function() {
      return api.start()
    })
  }

  stop() {
    return runtime.stop().then(function() {
      return api.stop()
    })
  }
}
