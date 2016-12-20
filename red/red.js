const runtime = require('./runtime')
const api = require('./api')

function init(httpServer) {
  runtime.init()
  api.init(httpServer, runtime)

}

function start() {
  return runtime.start().then(function() {
    return api.start()
  })
}

function stop() {
  return runtime.stop().then(function() {
    return api.stop()
  })
}

module.exports = {
  init,
  start,
  stop,
  api,
}

