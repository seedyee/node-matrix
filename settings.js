const path = require('path')

const { getVersion } = require('./server/utils')

const uiPort = process.env.UI_PORT || 1880
const uiHost = process.env.UI_HOST || '127.0.0.1'
const dataDir = path.resolve(path.join(__dirname, './data'))
const flowsFile = path.join(dataDir, 'flows.json')
const version = getVersion()

const settingsFile = path.join(__dirname, './settings.js')
const coreNodesDir = path.join(__dirname, './nodes')
const coreDotsDir = path.join(__dirname, './nodes/core')

module.exports = {
  uiPort,
  uiHost,
  dataDir,

  // Node-RED scans the `nodes` directory in the install directory to find nodes.
  // The following property can be used to specify an additional directory to scan.
  //nodesDir: '/home/nol/.node-red/nodes',
  coreNodesDir,
  coreDotsDir,
  version,
  settingsFile,
  // Retry time in milliseconds for MQTT connections
  mqttReconnectTime: 15000,

  // Retry time in milliseconds for Serial port connections
  serialReconnectTime: 15000,

  // Retry time in milliseconds for TCP socket connections
  //socketReconnectTime: 10000,

  // Timeout in milliseconds for TCP server socket connections
  //  defaults to no timeout
  //socketTimeout: 120000,

  // Timeout in milliseconds for HTTP request connections
  //  defaults to 120 seconds
  //httpRequestTimeout: 120000,

  // The maximum length, in characters, of any message sent to the debug sidebar tab
  debugMaxLength: 1000,

  flowsFile,

  // When httpAdminRoot is used to move the UI to a different root path, the
  // following property can be used to identify a directory of static content
  // that should be served at http://localhost:1880/.
  //httpStatic: '/home/nol/node-red-static/',

  // By default, the Node-RED UI is available at http://localhost:1880/
  // The following property can be used to specifiy a different root path.
  // If set to false, this is disabled.
  httpEditorRoot: '/',

  // Some nodes, such as HTTP In, can be used to listen for incoming http requests.
  // By default, these are served relative to '/'. The following property
  // can be used to specifiy a different root path. If set to false, this is
  // disabled.
  httpNodeRoot: '/',

  // The maximum size of HTTP request that will be accepted by the runtime api.
  // Default: 5mb
  apiMaxLength: '5mb',

  // If you installed the optional node-red-dashboard you can set it's path
  // relative to httpEditorRoot
  //ui: { path: "ui" },

  // The following property can be used to configure cross-origin resource sharing
  // in the HTTP nodes.
  // See https://github.com/troygoode/node-cors#configuration-options for
  // details on its contents. The following is a basic permissive set of options:
  //httpNodeCors: {
  //    origin: '*',
  //    methods: 'GET,PUT,POST,DELETE'
  //},

  // Anything in this hash is globally available to all functions.
  // It is accessed as context.global.
  // eg:
  //    functionGlobalContext: { os:require('os') }
  // can be accessed in a function block as:
  //    context.global.os

  functionGlobalContext: {
    // os:require('os'),
    // octalbonescript:require('octalbonescript'),
    // jfive:require('johnny-five'),
    // j5board:require('johnny-five').Board({repl:false})
  },

  // The following property can be used to order the categories in the editor
  // palette. If a node's category is not in the list, the category will get
  // added to the end of the palette.
  // If not set, the following default order is used:
  paletteCategories: ['subflows', 'input', 'output', 'function', 'social', 'mobile', 'storage', 'analysis', 'advanced'],
}
