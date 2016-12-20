const clone = require('clone')
const redUtil = require('../../util')

module.exports = {
  parseConfig: function(config) {
    const flow = {}
    flow.allNodes = {}
    flow.configs = {}
    flow.flows = {}

    config.forEach(function(n) {
      flow.allNodes[n.id] = clone(n)
      if (n.type === 'tab') {
        flow.flows[n.id] = n
        flow.flows[n.id].configs = {}
        flow.flows[n.id].nodes = {}
      }
    })
    var linkWires = {}
    var linkOutNodes = []
    config.forEach(function(n) {
      if (n.type !== 'tab') {
        var container = null
        if (flow.flows[n.z]) {
          container = flow.flows[n.z]
        }
        if (n.hasOwnProperty('x') && n.hasOwnProperty('y')) {
          if (container) {
            container.nodes[n.id] = n
          }
        } else {
          if (container) {
            container.configs[n.id] = n
          } else {
            flow.configs[n.id] = n
            flow.configs[n.id]._users = []
          }
        }
        if (n.type === 'link in' && n.links) {
          // Ensure wires are present in corresponding link out nodes
          n.links.forEach(function(id) {
            linkWires[id] = linkWires[id]||{}
            linkWires[id][n.id] = true
          })
        } else if (n.type === 'link out' && n.links) {
          linkWires[n.id] = linkWires[n.id]||{}
          n.links.forEach(function(id) {
            linkWires[n.id][id] = true
          })
          linkOutNodes.push(n)
        }
      }
    })
    linkOutNodes.forEach(function(n) {
      var links = linkWires[n.id]
      var targets = Object.keys(links)
      n.wires = [targets]
    })
    var addedTabs = {}
    config.forEach(function(n) {
      if (n.type !== 'tab') {
        for (var prop in n) {
          if (n.hasOwnProperty(prop) && prop !== 'id' && prop !== 'wires' && prop !== 'type' && prop !== '_users' && flow.configs.hasOwnProperty(n[prop])) {
            // This property references a global config node
            flow.configs[n[prop]]._users.push(n.id)
          }
        }
        if (n.z) {
          if (!flow.flows[n.z]) {
            flow.flows[n.z] = {type:'tab', id: n.z}
            flow.flows[n.z].configs = {}
            flow.flows[n.z].nodes = {}
            addedTabs[n.z] = flow.flows[n.z]
          }
          if (addedTabs[n.z]) {
            if (n.hasOwnProperty('x') && n.hasOwnProperty('y')) {
              addedTabs[n.z].nodes[n.id] = n
            } else {
              addedTabs[n.z].configs[n.id] = n
            }
          }
        }
      }
    })
    return flow
  },

  mapEnvVarProperties,
}

function mapEnvVarProperties(obj,prop) {
  if (Buffer.isBuffer(obj[prop])) {
    return
  } else if (Array.isArray(obj[prop])) {
    for (var i=0; i<obj[prop].length; i++) {
      mapEnvVarProperties(obj[prop],i)
    }
  } else if (typeof obj[prop] === 'string') {
    var m
    if ( (m = /^\$\((\S+)\)$/.exec(obj[prop])) !== null) {
      if (process.env.hasOwnProperty(m[1])) {
        obj[prop] = process.env[m[1]]
      }
    }
  } else {
    for (var p in obj[prop]) {
      if (obj[prop].hasOwnProperty(p)) {
        mapEnvVarProperties(obj[prop],p)
      }
    }
  }
}
