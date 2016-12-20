function basicAuthMiddleware(user, pass) {
  var basicAuth = require('basic-auth')
  var checkPassword
  if (pass.length == '32') {
    // Assume its a legacy md5 password
    checkPassword = function(p) {
      return crypto.createHash('md5').update(p,'utf8').digest('hex') === pass
    }
  } else {
    checkPassword = function(p) {
      return bcrypt.compareSync(p, pass)
    }
  }

  return function(req, res, next) {
    if (req.method === 'OPTIONS') {
      return next()
    }
    const requestUser = basicAuth(req)
    if (!requestUser || requestUser.name !== user || !checkPassword(requestUser.pass)) {
      res.set('WWW-Authenticate', 'Basic realm=Authorization Required')
      return res.sendStatus(401)
    }
    next()
  }
}
