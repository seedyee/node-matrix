const util = require('util')
const EventEmitter = require('events').EventEmitter
const { invert } = require('lodash')

const { logging } = require('../../settings')

const levels = {
  off:    1,
  fatal:  10,
  error:  20,
  warn:   30,
  info:   40,
  debug:  50,
  trace:  60,
  audit:  98,
  metric: 99,
}

const levelNames = invert(levels)

const logHandlers = []

function LogHandler () {
  this.logLevel = levels.info
  this.on('log', function(msg) {
    this.handler(msg)
  })
}

util.inherits(LogHandler, EventEmitter)

LogHandler.prototype.handler = function (msgObj) {
  const { level, type, name, id, msg } = msgObj
  console.log('['+levelNames[level]+'] '+(type?'['+type+':'+(name||id)+'] ':'')+msg)
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
  init: function() {
    addHandler(new LogHandler())
  },
  info: function(msg) {
    log({ level: levels.info, msg })
  },
  warn: function(msg) {
    log({ level: levels.warn, msg })
  },
  error: function(msg) {
    log({ level: levels.error, msg })
  },
  trace: function(msg) {
    log({ level: levels.trace, msg })
  },
  debug: function(msg) {
    log({ level: levels.debug, msg })
  },
}
