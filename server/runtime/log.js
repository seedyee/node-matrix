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
let metricsEnabled = false

function LogHandler (settings) {
  this.logLevel = levels[settings.level] || levels.info
  this.metricsOn = settings.metrics
  this.auditOn = settings.audit

  metricsEnabled = metricsEnabled || this.metricsOn

  this.on('log', function(msg) {
    if (this.shouldReportMessage(msg.level)) {
      this.handler(msg)
    }
  })
}

util.inherits(LogHandler, EventEmitter)
LogHandler.prototype.handler = function (msg) {
  if (msg.level == log.METRIC || msg.level == log.AUDIT) {
    console.log(`${levelNames[msg.level]} : ${JSON.stringify(msg)}`)
  } else {
    var message = msg.msg
    if (typeof message === 'object' && message.toString() === '[object Object]' && message.message) {
      message = message.message
    }
    console.log('['+levelNames[msg.level]+'] '+(msg.type?'['+msg.type+':'+(msg.name||msg.id)+'] ':'')+message)
  }
}


LogHandler.prototype.shouldReportMessage = function(msglevel) {
  return (msglevel == log.METRIC && this.metricsOn) ||
         (msglevel == log.AUDIT && this.auditOn) ||
         msglevel <= this.logLevel
}


var log = module.exports = {
  OFF:    1,
  FATAL:  10,
  ERROR:  20,
  WARN:   30,
  INFO:   40,
  DEBUG:  50,
  TRACE:  60,
  AUDIT:  98,
  METRIC: 99,
  init: function() {
    metricsEnabled = false
    Object.keys(logging).forEach(key => {
      const config = logging[key]
      if (key === 'console') {
        log.addHandler(new LogHandler(config))
      }
    })
  },
  addHandler: function(func) {
    logHandlers.push(func)
  },
  removeHandler: function(func) {
    var index = logHandlers.indexOf(func)
    if (index > -1) {
      logHandlers.splice(index, 1)
    }
  },
  log: function(msg) {
    msg.timestamp = Date.now()
    logHandlers.forEach(function(handler) {
      handler.emit('log', msg)
    })
  },
  info: function(msg) {
    log.log({ level: levels.info, msg })
  },
  warn: function(msg) {
    log.log({ level: levels.warn, msg })
  },
  error: function(msg) {
    log.log({ level: levels.error, msg })
  },
  trace: function(msg) {
    log.log({ level: levels.trace, msg })
  },
  debug: function(msg) {
    log.log({ level: levels.debug, msg })
  },
  metric: function() {
    return metricsEnabled
  },
  reportMetrics() {
    if (!metricsEnabled) return
    var memUsage = process.memoryUsage();

    log.log({
      level: log.METRIC,
      event: 'runtime.memory.rss',
      value: memUsage.rss,
    });
    log.log({
      level: log.METRIC,
      event: 'runtime.memory.heapTotal',
      value: memUsage.heapTotal,
    });
    log.log({
      level: log.METRIC,
      event: 'runtime.memory.heapUsed',
      value: memUsage.heapUsed,
    })
  },
  audit: function(msg,req) {
    msg.level = log.AUDIT
    if (req) {
      msg.user = req.user
      msg.path = req.path
      msg.ip = (req.headers && req.headers['x-forwarded-for']) || (req.connection && req.connection.remoteAddress) || undefined
    }
    log.log(msg)
  }
}