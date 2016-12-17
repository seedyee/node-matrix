/**
 * Copyright 2013, 2015 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
var fs = require('fs')
var fspath = require('path')
var when = require('when')

var redApp = null
var storage
var log
var needsPermission = require('./auth').needsPermission

function createLibrary(type) {
  if (redApp) {
    redApp.get(new RegExp('/library/'+type+'($|\/(.*))'),needsPermission('library.read'),function(req,res) {
      var path = req.params[1]||''
      storage.getLibraryEntry(type,path).then(function(result) {
        log.audit({event: 'library.get',type:type},req)
        if (typeof result === 'string') {
          res.writeHead(200, {'Content-Type': 'text/plain'})
          res.write(result)
          res.end()
        } else {
          res.json(result)
        }
      }).otherwise(function(err) {
        if (err) {
          if (err.code === 'forbidden') {
            log.audit({event: 'library.get',type:type,error:'forbidden'},req)
            res.status(403).end()
            return
          }
        }
        log.audit({event: 'library.get',type:type,error:'not_found'},req)
        res.status(404).end()
      })
    })

    redApp.post(new RegExp('/library/'+type+'\/(.*)'),needsPermission('library.write'),function(req,res) {
      var path = req.params[0]
      var meta = req.body
      var text = meta.text
      delete meta.text

      storage.saveLibraryEntry(type,path,meta,text).then(function() {
        log.audit({event: 'library.set',type:type},req)
        res.status(204).end()
      }).otherwise(function(err) {
        if (err.code === 'forbidden') {
          log.audit({event: 'library.set',type:type,error:'forbidden'},req)
          res.status(403).end()
          return
        }
        log.audit({event: 'library.set',type:type,error:'unexpected_error',message:err.toString()},req)
        res.status(500).json({error:'unexpected_error', message:err.toString()})
      })
    })
  }
}

module.exports = {
  init: function(app,runtime) {
    redApp = app
    log = runtime.log
    storage = runtime.storage
  },
  register: createLibrary,
  getAll: function(req,res) {
    storage.getAllFlows('/').then(function(flows) {
      console.log('-------------------flows', flows)
      res.json(flows)
    })
  },
  get: function(req,res) {
    storage.getFlow(req.params[0]).then(function(data) {
      // data is already a JSON string
      log.audit({event: 'library.get',type:'flow',path:req.params[0]},req)
      res.set('Content-Type', 'application/json')
      res.send(data)
    }).otherwise(function(err) {
      if (err) {
        if (err.code === 'forbidden') {
          log.audit({event: 'library.get',type:'flow',path:req.params[0],error:'forbidden'},req)
          res.status(403).end()
          return
        }
      }
      log.audit({event: 'library.get',type:'flow',path:req.params[0],error:'not_found'},req)
      res.status(404).end()
    })
  },
  post: function(req,res) {
    var flow = JSON.stringify(req.body)
    storage.saveFlow(req.params[0],flow).then(function() {
      log.audit({event: 'library.set',type:'flow',path:req.params[0]},req)
      res.status(204).end()
    }).otherwise(function(err) {
      if (err.code === 'forbidden') {
        log.audit({event: 'library.set',type:'flow',path:req.params[0],error:'forbidden'},req)
        res.status(403).end()
        return
      }
      log.audit({event: 'library.set',type:'flow',path:req.params[0],error:'unexpected_error',message:err.toString()},req)
      res.status(500).send({error:'unexpected_error', message:err.toString()})
    })
  }
}
