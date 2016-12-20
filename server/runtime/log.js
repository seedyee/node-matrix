const EventEmitter = require('events').EventEmitter

class LogHandler extends EventEmitter {
  constructor() {
    super()
    this.on('log', (msg) => {
      this.handler(msg)
    })
  }
  handler(msgObj) {
    const { level, msg } = msgObj
    console.log(`${level} ${msg}`)
  }
}

function log(msg) {
  msg.timestamp = Date.now()
  logHandlers.forEach(function(handler) {
    handler.emit('log', msg)
  })
}

function addHandler(func) {
  logHandlers.push(func)
}

function removeHandler(func) {
  var index = logHandlers.indexOf(func)
  if (index > -1) {
    logHandlers.splice(index, 1)
  }
}

const logHandlers = []
addHandler(new LogHandler())

module.exports = {
  OFF:    1,
  FATAL:  10,
  ERROR:  20,
  WARN:   30,
  INFO:   40,
  DEBUG:  50,
  TRACE:  60,
  AUDIT:  98,
  METRIC: 99,

  log,
  addHandler,
  removeHandler,
  info: function(msg) {
    log({ level: '[info]', msg })
  },
  warn: function(msg) {
    log({ level: '[warn]', msg })
  },
  error: function(msg) {
    log({ level: '[error]', msg })
  },
  trace: function(msg) {
    log({ level: '[trace]', msg })
  },
  debug: function(msg) {
    log({ level: '[debug]', msg })
  },
}
