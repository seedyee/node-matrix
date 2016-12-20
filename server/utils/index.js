const path = require('path')

exports.getVersion = function() {
  let version
  try {
    version = require(path.join(__dirname, '../../package.json')).version
  } catch(err) {
    console.log(err)
  }
  if (!version) {
    console.log('[warn]: Can\'t find version field in package.json')
  }
  return version
}
