var RED = (function() {
  function loadNodeList() {
    $.ajax({
      headers: {
        'Accept':'application/json'
      },
      cache: false,
      url: 'nodes',
      success: function(data) {
        RED.nodes.setNodeList(data)
        loadNodes()
      }
    })
  }

  function loadNodes() {
    $.ajax({
      headers: {
        'Accept':'text/html'
      },
      cache: false,
      url: 'nodes',
      success: function(data) {
        $('body').append(data)
        $('body').i18n()
        $('#palette > .palette-spinner').hide()
        $('.palette-scroll').removeClass('hide')
        $('#palette-search').removeClass('hide')
        loadFlows()
      }
    })
  }

  function loadFlows() {
    $.ajax({
      headers: {
        'Accept':'application/json',
      },
      cache: false,
      url: 'flows',
      success: function(nodes) {
        var currentHash = window.location.hash
        RED.nodes.version(nodes.rev)
        RED.nodes.import(nodes.flows)
        RED.nodes.dirty(false)
        RED.view.redraw(true)
        if (/^#flow\/.+$/.test(currentHash)) {
          RED.workspaces.show(currentHash.substring(6))
        }
        RED.comms.subscribe('status/#',function(topic,msg) {
          var parts = topic.split('/')
          var node = RED.nodes.node(parts[1])
          if (node) {
            if (msg.hasOwnProperty('text')) {
              msg.text = node._(msg.text.toString(),{defaultValue:msg.text.toString()})
            }
            node.status = msg
            if (statusEnabled) {
              node.dirty = true
              RED.view.redraw()
            }
          }
        })
      }
    })
  }

  var statusEnabled = false
  function toggleStatus(state) {
    statusEnabled = state
    RED.view.status(statusEnabled)
  }

  function loadEditor() {

    var menuOptions = []
    menuOptions.push(
      {
        id:'menu-item-view-menu',
        label:RED._('menu.label.view.view'),
        options:[
          {
            id:'menu-item-view-show-grid',
            label:RED._('menu.label.view.showGrid'),
            toggle:true,
            onselect:RED.view.toggleShowGrid
          },
          {
            id:'menu-item-view-snap-grid',
            label:RED._('menu.label.view.snapGrid'),
            toggle:true,
            onselect:RED.view.toggleSnapGrid
          },
          {
            id:'menu-item-status',
            label:RED._('menu.label.displayStatus'),
            toggle:true,
            onselect:toggleStatus,
            selected: true
          },
          null,
          {
            id:'menu-item-sidebar',
            label:RED._('menu.label.sidebar.show'),
            toggle:true,
            onselect:RED.sidebar.toggleSidebar,
            selected: true
          }
      ]
      })
    menuOptions.push(null)
    menuOptions.push({id:'menu-item-import',label:RED._('menu.label.import'),options:[
      {id:'menu-item-import-clipboard',label:RED._('menu.label.clipboard'),onselect:RED.clipboard.import},
      {id:'menu-item-import-library',label:RED._('menu.label.library'),options:[]}
    ]})
    menuOptions.push({id:'menu-item-export',label:RED._('menu.label.export'),disabled:true,options:[
      {id:'menu-item-export-clipboard',label:RED._('menu.label.clipboard'),disabled:true,onselect:RED.clipboard.export},
      {id:'menu-item-export-library',label:RED._('menu.label.library'),disabled:true,onselect:RED.library.export}
    ]})
    menuOptions.push(null)
    menuOptions.push({id:'menu-item-search',label:RED._('menu.label.search'),onselect:RED.search.show})
    menuOptions.push(null)
    menuOptions.push({id:'menu-item-config-nodes',label:RED._('menu.label.displayConfig'),onselect:function() {}})
    menuOptions.push({id:'menu-item-workspace',label:RED._('menu.label.flows'),options:[
      {id:'menu-item-workspace-add',label:RED._('menu.label.add'),onselect:RED.workspaces.add},
      {id:'menu-item-workspace-edit',label:RED._('menu.label.rename'),onselect:RED.workspaces.edit},
      {id:'menu-item-workspace-delete',label:RED._('menu.label.delete'),onselect:RED.workspaces.remove}
    ]})
    menuOptions.push({id:'menu-item-subflow',label:RED._('menu.label.subflows'), options: [
      {id:'menu-item-subflow-create',label:RED._('menu.label.createSubflow'),onselect:RED.subflow.createSubflow},
      {id:'menu-item-subflow-convert',label:RED._('menu.label.selectionToSubflow'),disabled:true,onselect:RED.subflow.convertToSubflow},
    ]})
    menuOptions.push(null)
    if (RED.settings.theme('palette.editable') !== false) {
      RED.palette.editor.init()
      menuOptions.push({id:'menu-item-edit-palette',label:RED._('menu.label.editPalette'),onselect:RED.palette.editor.show})
      menuOptions.push(null)
    }

    menuOptions.push({id:'menu-item-keyboard-shortcuts',label:RED._('menu.label.keyboardShortcuts'),onselect:RED.keyboard.showHelp})
    menuOptions.push({id:'menu-item-help',
                      label: RED.settings.theme('menu.menu-item-help.label','Node-RED website'),
                      href: RED.settings.theme('menu.menu-item-help.url','http://nodered.org/docs')
                     })

    RED.menu.init({id:'btn-sidemenu',options: menuOptions})

    RED.user.init()

    RED.library.init()
    RED.palette.init()
    RED.sidebar.init()
    RED.subflow.init()
    RED.workspaces.init()
    RED.clipboard.init()
    RED.search.init()
    RED.view.init()
    RED.editor.init()

    RED.deploy.init(RED.settings.theme('deployButton',null))

    RED.keyboard.add(
      'workspace',
      191,
      {shift:true},
      function() {
        RED.keyboard.showHelp()
        d3.event.preventDefault()
      })
    RED.comms.connect()

    $('#main-container').show()
    $('.header-toolbar').show()

    loadNodeList()
  }

  $(function() {

    if ((window.location.hostname !== 'localhost') && (window.location.hostname !== '127.0.0.1')) {
      document.title = document.title+' : '+window.location.hostname
    }

    ace.require('ace/ext/language_tools')

    RED.i18n.init(function() {
      RED.settings.init(loadEditor)
    })
  })

  return {
  }
})()
