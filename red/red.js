const fs = require('fs')
const path = require('path')

const runtime = require('./runtime')
const api = require('./api')
const userSettings = require('../settings')

let nodeApp = null
let adminApp = null
let server = null
let apiEnabled = false

module.exports = class Dot {
  constructor(httpServer) {
    runtime.init()
    api.init(httpServer, runtime)
    apiEnabled = true

    const { adminApp, nodeApp, server, comms, library, auth } = api
    this.adminApp = adminApp
    this.nodeApp = nodeApp
    this.server = server
    this.comms = comms
    this.library = library
    this.auth = auth

    const { nodes, log, settings, util, version } = runtime
    this.log = log
    this.settings = settings
    this.version = version
    this.util = util
    this.nodes
  }
  start() {
    return runtime.start().then(function() {
      if (apiEnabled) {
        return api.start()
      }
    })
  }
  stop() {
    return runtime.stop().then(function() {
      if (apiEnabled) {
        return api.stop()
      }
    })
  }
}

// module.exports = {
//   init: function(httpServer) {
//     runtime.init()
//     api.init(httpServer, runtime)
//     apiEnabled = true
//     adminApp = api.adminApp
//     nodeApp = api.nodeApp
//     server = api.server
//     return
//   },
//   start: function() {
//     return runtime.start().then(function() {
//       if (apiEnabled) {
//         return api.start()
//       }
//     })
//   },
//   stop: function() {
//     return runtime.stop().then(function() {
//       if (apiEnabled) {
//         return api.stop()
//       }
//     })
//   },

//   nodes: runtime.nodes,
//   log: runtime.log,
//   settings: runtime.settings,
//   util: runtime.util,
//   version: runtime.version,

//   comms: api.comms,
//   library: api.library,
//   auth: api.auth,

//   get httpAdmin() { return adminApp },
//   get httpNode() { return nodeApp },
//   get server() { return server },
// }
