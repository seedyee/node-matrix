const util = require('util')
const EventEmitter = require('events').EventEmitter
const when = require('when')
const redUtil = require('../util')
const Log = require('../log')
const context = require('./context')
const flows = require('./flows')

function noop() {}
function Node(nodeConfig) {
  const { id, type, z, name, _alias, wires } = nodeConfig
  this.id = id
  this.type = type
  this.z = z
  this._closeCallbacks = []

  if (name) {
    this.name = name
  }
  if (_alias) {
    this._alias = _alias
  }
  this.updateWires(wires)
}

util.inherits(Node, EventEmitter)

Node.prototype.updateWires = function(wires = []) {
  this.wires = wires
  delete this._wire

  let wc = 0
  this.wires.forEach(function(w) {
    wc+= w.length
  })
  this._wireCount = wc
  if (wc === 0) {
    // With nothing wired to the node, no-op send
    this.send = noop
  } else {
    this.send = Node.prototype.send
    if (this.wires.length === 1 && this.wires[0].length === 1) {
      // Single wire, so we can shortcut the send when
      // a single message is sent
      this._wire = this.wires[0][0]
    }
  }
}

Node.prototype.context = function() {
  if (!this._context) {
    this._context = context.get( this._alias || this.id, this.z)
  }
  return this._context
}

Node.prototype._on = Node.prototype.on

Node.prototype.on = function(event, callback) {
  const node = this
  if (event == 'close') {
    this._closeCallbacks.push(callback)
  } else {
    this._on(event, callback)
  }
}

Node.prototype.close = function() {
  const promises = []
  const node = this
  this._closeCallbacks.forEach(callback => {
    if (callback.length == 1) {
      promises.push(
        when.promise(function(resolve) {
          callback.call(node, function() {
            resolve()
          })
        })
      )
    } else {
      callback.call(node)
    }
  })
  if (promises.length > 0) {
    return when.settle(promises).then(function() {
      if (this._context) {
        context.delete(this._alias||this.id,this.z)
      }
    })
  } else {
    if (this._context) {
      context.delete(this._alias||this.id,this.z)
    }
  }
}

Node.prototype.send = function(msg) {
  var msgSent = false
  var node
  if (msg === null || typeof msg === 'undefined') {
    return
  } else if (!util.isArray(msg)) {
    if (this._wire) {
      // A single message and a single wire on output 0
      // TODO: pre-load flows.get calls - cannot do in constructor
      //       as not all nodes are defined at that point
      if (!msg._msgid) {
        msg._msgid = redUtil.generateId()
      }
      node = flows.get(this._wire)
      /* istanbul ignore else */
      if (node) {
        node.receive(msg)
      }
      return
    } else {
      msg = [msg]
    }
  }

  const numOutputs = this.wires.length

  // Build a list of send events so that all cloning is done before
  // any calls to node.receive
  const sendEvents = []

  let sentMessageId = null

  // for each output of node eg. [msgs to output 0, msgs to output 1, ...]
  for (var i = 0; i < numOutputs; i++) {
    var wires = this.wires[i] // wires leaving output i
    /* istanbul ignore else */
    if (i < msg.length) {
      var msgs = msg[i] // msgs going to output i
      if (msgs !== null && typeof msgs !== 'undefined') {
        if (!util.isArray(msgs)) {
          msgs = [msgs]
        }
        var k = 0
        // for each recipent node of that output
        for (var j = 0; j < wires.length; j++) {
          node = flows.get(wires[j]) // node at end of wire j
          if (node) {
            // for each msg to send eg. [[m1, m2, ...], ...]
            for (k = 0; k < msgs.length; k++) {
              var m = msgs[k]
              if (m !== null && m !== undefined) {
                /* istanbul ignore else */
                if (!sentMessageId) {
                  sentMessageId = m._msgid
                }
                if (msgSent) {
                  var clonedmsg = redUtil.cloneMessage(m)
                  sendEvents.push({n:node,m:clonedmsg})
                } else {
                  sendEvents.push({n:node,m:m})
                  msgSent = true
                }
              }
            }
          }
        }
      }
    }
  }
  /* istanbul ignore else */
  if (!sentMessageId) {
    sentMessageId = redUtil.generateId()
  }
  for (i=0; i<sendEvents.length; i++) {
    var ev = sendEvents[i]
    /* istanbul ignore else */
    if (!ev.m._msgid) {
      ev.m._msgid = sentMessageId
    }
    ev.n.receive(ev.m)
  }
}

Node.prototype.receive = function(msg) {
  if (!msg) {
    msg = {}
  }
  if (!msg._msgid) {
    msg._msgid = redUtil.generateId()
  }
  try {
    this.emit('input', msg)
  } catch(err) {
    this.error(err, msg)
  }
}

function logHelper(self, level, msg) {
  const { name, id, type } = self
  const o = {
    level: level,
    id: id,
    name,
    type,
    msg: msg,
  }
  Log.log(o)
}

Node.prototype.log = function(msg) {
  logHelper(this, Log.INFO, msg)
}

Node.prototype.warn = function(msg) {
  logHelper(this, Log.WARN, msg)
}

Node.prototype.error = function(logMessage,msg) {
  if (typeof logMessage != 'boolean') {
    logMessage = logMessage || ''
  }
  logHelper(this, Log.ERROR, logMessage)
  /* istanbul ignore else */
  if (msg) {
    flows.handleError(this,logMessage,msg)
  }
}

/**
 * If called with no args, returns whether metric collection is enabled
 */
// fake metric functino
Node.prototype.metric = function() { return false }

/**
 * status: { fill:'red|green', shape:'dot|ring', text:'blah' }
 */
Node.prototype.status = function(status) {
  flows.handleStatus(this,status)
}

/**
 * Called from a Node's constructor function, invokes the super-class
 * constructor and attaches any credentials to the node.
 * @param node the node object being created
 * @param def the instance definition for the node
 */

// function sample(RED) {
//   function SampleNode(n) {
//     const node = this
//     RED.nodes.createNode(this, n)
//     this.send('a message')
//     this.on('input', (v) => {
//       node.send(v)
//     })
//   }
//   RED.nodes.registerType('sample', SampleNode)
// }

function createNode(node, def) {
  Node.call(node, def)
  let id = node.id
  if (def._alias) {
    id = def._alias
  }
}

module.exports = {
  Node,
  createNode,
}
