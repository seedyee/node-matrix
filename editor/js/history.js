RED.history = (function() {
  var undo_history = [];

  return {
    //TODO: this function is a placeholder until there is a 'save' event that can be listened to
    markAllDirty: function() {
      for (var i=0;i<undo_history.length;i++) {
        undo_history[i].dirty = true;
      }
    },
    list: function() {
      return undo_history
    },
    depth: function() {
      return undo_history.length;
    },
    push: function(ev) {
      undo_history.push(ev);
    },
    pop: function() {
      var ev = undo_history.pop();
      var i;
      var node;
      var modifiedTabs = {};
      if (ev) {
        if (ev.t == 'add') {
          if (ev.nodes) {
            for (i=0;i<ev.nodes.length;i++) {
              node = RED.nodes.node(ev.nodes[i]);
              if (node.z) {
                modifiedTabs[node.z] = true;
              }
              RED.nodes.remove(ev.nodes[i]);
            }
          }
          if (ev.links) {
            for (i=0;i<ev.links.length;i++) {
              RED.nodes.removeLink(ev.links[i]);
            }
          }
          if (ev.workspaces) {
            for (i=0;i<ev.workspaces.length;i++) {
              RED.nodes.removeWorkspace(ev.workspaces[i].id);
              RED.workspaces.remove(ev.workspaces[i]);
            }
          }
          if (ev.removedLinks) {
            for (i=0;i<ev.removedLinks.length;i++) {
              RED.nodes.addLink(ev.removedLinks[i]);
            }
          }

        } else if (ev.t == "delete") {
          if (ev.workspaces) {
            for (i=0;i<ev.workspaces.length;i++) {
              RED.nodes.addWorkspace(ev.workspaces[i]);
              RED.workspaces.add(ev.workspaces[i]);
            }
          }
          if (ev.nodes) {
            for (i=0;i<ev.nodes.length;i++) {
              RED.nodes.add(ev.nodes[i]);
              modifiedTabs[ev.nodes[i].z] = true;
            }
          }
          if (ev.links) {
            for (i=0;i<ev.links.length;i++) {
              RED.nodes.addLink(ev.links[i]);
            }
          }
          if (ev.changes) {
            for (i in ev.changes) {
              if (ev.changes.hasOwnProperty(i)) {
                node = RED.nodes.node(i);
                if (node) {
                  for (var d in ev.changes[i]) {
                    if (ev.changes[i].hasOwnProperty(d)) {
                      node[d] = ev.changes[i][d];
                    }
                  }
                  node.dirty = true;
                }
              }
            }

          }
        } else if (ev.t == "move") {
          for (i=0;i<ev.nodes.length;i++) {
            var n = ev.nodes[i];
            n.n.x = n.ox;
            n.n.y = n.oy;
            n.n.dirty = true;
            n.n.changed = n.changed;
          }
          // A move could have caused a link splice
          if (ev.links) {
            for (i=0;i<ev.links.length;i++) {
              RED.nodes.removeLink(ev.links[i]);
            }
          }
          if (ev.removedLinks) {
            for (i=0;i<ev.removedLinks.length;i++) {
              RED.nodes.addLink(ev.removedLinks[i]);
            }
          }
        } else if (ev.t == "edit") {
          for (i in ev.changes) {
            if (ev.changes.hasOwnProperty(i)) {
              if (ev.node._def.defaults[i].type) {
                // This is a config node property
                var currentConfigNode = RED.nodes.node(ev.node[i]);
                if (currentConfigNode) {
                  currentConfigNode.users.splice(currentConfigNode.users.indexOf(ev.node),1);
                }
                var newConfigNode = RED.nodes.node(ev.changes[i]);
                if (newConfigNode) {
                  newConfigNode.users.push(ev.node);
                }
              }
              ev.node[i] = ev.changes[i];
            }
          }
          RED.editor.updateNodeProperties(ev.node);
          RED.editor.validateNode(ev.node);
          if (ev.links) {
            for (i=0;i<ev.links.length;i++) {
              RED.nodes.addLink(ev.links[i]);
            }
          }
          ev.node.dirty = true;
          ev.node.changed = ev.changed;
        } else if (ev.t == "reorder") {
          if (ev.order) {
            RED.workspaces.order(ev.order);
          }
        }
        RED.nodes.dirty(ev.dirty);
        RED.view.redraw(true);
        RED.palette.refresh();
        RED.workspaces.refresh();
        RED.sidebar.config.refresh();
      }
    },
    peek: function() {
      return undo_history[undo_history.length-1];
    }
  }

})();
