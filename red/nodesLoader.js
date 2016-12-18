const { join } = require('path')
const { coreNodesDir } = require('../settings')

const p = function (fileName, subDir = 'core', rootDir = coreNodesDir) {
  return join(rootDir, subDir ,fileName)
}

module.exports = {
  // analysis
  sentiment: p('analysis/72-sentiment'),
  // core
  inject: p('core/20-inject'),
  catch: p('core/25-catch'),
  status: p('core/25-status'),
  debug: p('core/58-debug'),
  link: p('core/60-link'),
  link: p('core/60-link'),
  link: p('core/60-link'),
  link: p('core/60-link'),
  exec: p('core/75-exec'),
  function: p('core/80-function'),
  template: p('core/80-template'),
  delay: p('core/89-delay'),
  trigger: p('core/89-trigger'),
  comment: p('core/90-comment'),
  unknown: p('core/98-unknown'),
  // io
  tls: p('io/05-tls'),
  mqtt: p('io/10-mqtt'),
  httpin: p('io/21-httpin'),
  httprequest: p('io/21-httprequest'),
  websocket: p('io/22-websocket'),
  watch: p('io/23-watch'),
  tcp: p('io/31-tcpin'),
  udp: p('io/32-udp'),
  // logic
  switch: p('logic/10-switch'),
  change: p('logic/15-change'),
  range: p('logic/16-range'),
  split: p('logic/17-split'),
  // parsers
  CSV: p('parsers/70-CSV'),
  HTML: p('parsers/70-HTML'),
  JSON: p('parsers/70-JSON'),
  XML: p('parsers/70-XML'),
  // storage
  tail: p('storage/28-tail'),
  file: p('storage/50-file'),
  // others
  lowercase: p('others/lower-case'),
}
