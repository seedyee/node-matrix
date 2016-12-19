var clone = require("clone");
var redUtil = require("../../util");
var subflowInstanceRE = /^subflow:(.+)$/;
var typeRegistry = require("../registry");

function diffNodes(oldNode,newNode) {
  if (oldNode == null) {
    return true;
  }
  var oldKeys = Object.keys(oldNode).filter(function(p) { return p != "x" && p != "y" && p != "wires" });
  var newKeys = Object.keys(newNode).filter(function(p) { return p != "x" && p != "y" && p != "wires" });
  if (oldKeys.length != newKeys.length) {
    return true;
  }
  for (var i=0;i<newKeys.length;i++) {
    var p = newKeys[i];
    if (!redUtil.compareObjects(oldNode[p],newNode[p])) {
      return true;
    }
  }

  return false;
}

var EnvVarPropertyRE = /^\$\((\S+)\)$/;

function mapEnvVarProperties(obj,prop) {
  if (Buffer.isBuffer(obj[prop])) {
    return;
  } else if (Array.isArray(obj[prop])) {
    for (var i=0;i<obj[prop].length;i++) {
      mapEnvVarProperties(obj[prop],i);
    }
  } else if (typeof obj[prop] === 'string') {
    var m;
    if ( (m = EnvVarPropertyRE.exec(obj[prop])) !== null) {
      if (process.env.hasOwnProperty(m[1])) {
        obj[prop] = process.env[m[1]];
      }
    }
  } else {
    for (var p in obj[prop]) {
      if (obj[prop].hasOwnProperty(p)) {
        mapEnvVarProperties(obj[prop],p);
      }
    }
  }
}

module.exports = {

  diffNodes: diffNodes,
  mapEnvVarProperties: mapEnvVarProperties,

  parseConfig: function(config) {
    var flow = {};
    flow.allNodes = {};
    flow.subflows = {};
    flow.configs = {};
    flow.flows = {};
    flow.missingTypes = [];

    config.forEach(function(n) {
      flow.allNodes[n.id] = clone(n);
      if (n.type === 'tab') {
        flow.flows[n.id] = n;
        flow.flows[n.id].subflows = {};
        flow.flows[n.id].configs = {};
        flow.flows[n.id].nodes = {};
      }
    });

    config.forEach(function(n) {
      if (n.type === 'subflow') {
        flow.subflows[n.id] = n;
        flow.subflows[n.id].configs = {};
        flow.subflows[n.id].nodes = {};
        flow.subflows[n.id].instances = [];
      }
    });
    var linkWires = {};
    var linkOutNodes = [];
    config.forEach(function(n) {
      if (n.type !== 'subflow' && n.type !== 'tab') {
        var subflowDetails = subflowInstanceRE.exec(n.type);

        if ( (subflowDetails && !flow.subflows[subflowDetails[1]]) || (!subflowDetails && !typeRegistry.getType(n.type)) ) {
          if (flow.missingTypes.indexOf(n.type) === -1) {
            flow.missingTypes.push(n.type);
          }
        }
        var container = null;
        if (flow.flows[n.z]) {
          container = flow.flows[n.z];
        } else if (flow.subflows[n.z]) {
          container = flow.subflows[n.z];
        }
        if (n.hasOwnProperty('x') && n.hasOwnProperty('y')) {
          if (subflowDetails) {
            var subflowType = subflowDetails[1]
            n.subflow = subflowType;
            flow.subflows[subflowType].instances.push(n)
          }
          if (container) {
            container.nodes[n.id] = n;
          }
        } else {
          if (container) {
            container.configs[n.id] = n;
          } else {
            flow.configs[n.id] = n;
            flow.configs[n.id]._users = [];
          }
        }
        if (n.type === 'link in' && n.links) {
          // Ensure wires are present in corresponding link out nodes
          n.links.forEach(function(id) {
            linkWires[id] = linkWires[id]||{};
            linkWires[id][n.id] = true;
          })
        } else if (n.type === 'link out' && n.links) {
          linkWires[n.id] = linkWires[n.id]||{};
          n.links.forEach(function(id) {
            linkWires[n.id][id] = true;
          })
          linkOutNodes.push(n);
        }
      }
    });
    linkOutNodes.forEach(function(n) {
      var links = linkWires[n.id];
      var targets = Object.keys(links);
      n.wires = [targets];
    });


    var addedTabs = {};
    config.forEach(function(n) {
      if (n.type !== 'subflow' && n.type !== 'tab') {
        for (var prop in n) {
          if (n.hasOwnProperty(prop) && prop !== 'id' && prop !== 'wires' && prop !== 'type' && prop !== '_users' && flow.configs.hasOwnProperty(n[prop])) {
            // This property references a global config node
            flow.configs[n[prop]]._users.push(n.id)
          }
        }
        if (n.z && !flow.subflows[n.z]) {

          if (!flow.flows[n.z]) {
            flow.flows[n.z] = {type:'tab',id:n.z};
            flow.flows[n.z].subflows = {};
            flow.flows[n.z].configs = {};
            flow.flows[n.z].nodes = {};
            addedTabs[n.z] = flow.flows[n.z];
          }
          if (addedTabs[n.z]) {
            if (n.hasOwnProperty('x') && n.hasOwnProperty('y')) {
              addedTabs[n.z].nodes[n.id] = n;
            } else {
              addedTabs[n.z].configs[n.id] = n;
            }
          }
        }
      }
    });
    return flow;
  },
}
