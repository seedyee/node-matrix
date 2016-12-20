// let redApp = null

// function createLibrary(type) {
//   if (redApp) {
//     redApp.get(new RegExp('/library/'+type+'($|\/(.*))'), function(req,res) {
//       var path = req.params[1]||''
//       storage.getLibraryEntry(path).then(function(result) {
//         if (typeof result === 'string') {
//           res.writeHead(200, {'Content-Type': 'text/plain'})
//           res.write(result)
//           res.end()
//         } else {
//           res.json(result)
//         }
//       }).otherwise(function(err) {
//         if (err) {
//           if (err.code === 'forbidden') {
//             res.status(403).end()
//             return
//           }
//         }
//         res.status(404).end()
//       })
//     })

//     redApp.post(new RegExp('/library/'+type+'\/(.*)'), function(req,res) {
//       const path = req.params[0]
//       const libContenct = req.body.text

//       storage.saveLibraryEntry(path, libContenct).then(function() {
//         res.status(204).end()
//       }).otherwise(function(err) {
//         if (err.code === 'forbidden') {
//           res.status(403).end()
//           return
//         }
//         res.status(500).json({error:'unexpected_error', message:err.toString()})
//       })
//     })
//   }
// }

storage = require('../storage')
module.exports = {
  // register: createLibrary,
  // fake register api
  register: function() {},
  getAll: function(req,res) {
    const libs = storage.getAllLibs()
    res.json(libs)
  },
  get: function(req,res) {
    const data = storage.getLibEntry(req.params[0])
    res.json(data)
  },
  post: function(req,res) {
    var libContenct = JSON.stringify(req.body)
    storage.saveLibraryEntry(req.params[0], libContenct).then(function() {
      res.status(204).end()
    }).otherwise(function(err) {
      if (err.code === 'forbidden') {
        res.status(403).end()
        return
      }
      res.status(500).send({error:'unexpected_error', message:err.toString()})
    })
  }
}
