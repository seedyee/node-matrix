var when = require("when");
var clone = require("clone");
var typeRegistry = require("../registry");
var Log = require("../../log");
var redUtil = require("../../util");
var flowUtil = require("./util");

function Flow(global,flow) {
  if (typeof flow === 'undefined') {
    flow = global;
  }
  var activeNodes = {};
  var catchNodeMap = {};
  var statusNodeMap = {};

  this.start = function(diff) {
    var node;
    var newNode;
    var id;
    catchNodeMap = {};
    statusNodeMap = {};

    var configNodes = Object.keys(flow.configs);
    var configNodeAttempts = {};
    while (configNodes.length > 0) {
      id = configNodes.shift();
      node = flow.configs[id];
      if (!activeNodes[id]) {
        var readyToCreate = true;
        // This node doesn't exist.
        // Check it doesn't reference another non-existent config node
        for (var prop in node) {
          if (node.hasOwnProperty(prop) && prop !== 'id' && prop !== 'wires' && prop !== '_users' && flow.configs[node[prop]]) {
            if (!activeNodes[node[prop]]) {
              // References a non-existent config node
              // Add it to the back of the list to try again later
              configNodes.push(id);
              configNodeAttempts[id] = (configNodeAttempts[id]||0)+1;
              if (configNodeAttempts[id] === 100) {
                throw new Error("Circular config node dependency detected: "+id);
              }
              readyToCreate = false;
              break;
            }
          }
        }
        if (readyToCreate) {
          newNode = createNode(node.type,node);
          if (newNode) {
            activeNodes[id] = newNode;
          }
        }
      }
    }

    for (id in flow.nodes) {
      node = flow.nodes[id];
      if (!activeNodes[id]) {
        newNode = createNode(node.type,node);
        if (newNode) {
          activeNodes[id] = newNode;
        }
      }
    }

    for (id in activeNodes) {
      if (activeNodes.hasOwnProperty(id)) {
        node = activeNodes[id];
        if (node.type === "catch") {
          catchNodeMap[node.z] = catchNodeMap[node.z] || [];
          catchNodeMap[node.z].push(node);
        } else if (node.type === "status") {
          statusNodeMap[node.z] = statusNodeMap[node.z] || [];
          statusNodeMap[node.z].push(node);
        }
      }
    }
  }

  this.stop = function(stopList) {
    return when.promise(function(resolve) {
      var i;
      if (!stopList) {
        stopList = Object.keys(activeNodes);
      }
      var promises = [];
      for (i=0;i<stopList.length;i++) {
        var node = activeNodes[stopList[i]];
        if (node) {
          delete activeNodes[stopList[i]];
          try {
            var p = node.close();
            if (p) {
              promises.push(p);
            }
          } catch(err) {
            node.error(err);
          }
        }
      }
      when.settle(promises).then(function() {
        resolve();
      });
    });
  }

  this.update = function(_global,_flow) {
    global = _global;
    flow = _flow;
  }

  this.getNode = function(id) {
    return activeNodes[id];
  }

  this.getActiveNodes = function() {
    return activeNodes;
  }

  this.handleStatus = function(node,statusMessage) {
    var targetStatusNodes = null;
    var reportingNode = node;
    var handled = false;
    while (reportingNode && !handled) {
      targetStatusNodes = statusNodeMap[reportingNode.z];
      if (targetStatusNodes) {
        targetStatusNodes.forEach(function(targetStatusNode) {
          if (targetStatusNode.scope && targetStatusNode.scope.indexOf(node.id) === -1) {
            return;
          }
          var message = {
            status: {
              text: "",
              source: {
                id: node.id,
                type: node.type,
                name: node.name
              }
            }
          };
          if (statusMessage.hasOwnProperty("text")) {
            message.status.text = statusMessage.text.toString();
          }
          targetStatusNode.receive(message);
          handled = true;
        });
      }
      if (!handled) {
        reportingNode = activeNodes[reportingNode.z];
      }
    }
  }

  // fake handleError
  this.handleError = function() {}
}

function createNode(type,config) {
  var nn = null;
  var nt = typeRegistry.getType(type);
  if (nt) {
    var conf = clone(config);
    delete conf.credentials;
    for (var p in conf) {
      if (conf.hasOwnProperty(p)) {
        flowUtil.mapEnvVarProperties(conf,p);
      }
    }
    try {
      nn = new nt(conf);
    }
    catch (err) {
      Log.log({
        level: Log.ERROR,
        id:conf.id,
        type: type,
        msg: err
      });
    }
  } else {
    Log.error(`unknow flow type ${type}`);
  }
  return nn;
}

module.exports = {
  create: function(global,conf) {
    return new Flow(global,conf);
  }
}
