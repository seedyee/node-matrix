RED.i18n = (function() {

  return {
    init: function(done) {
      i18n.init({
        resGetPath: 'locales/__ns__',
        dynamicLoad: false,
        load:'current',
        ns: {
          namespaces: ["editor","node-red"],
          defaultNs: "editor"
        },
        fallbackLng: ['en-US'],
        useCookie: false
      },function() {
        done();
      });
      RED["_"] = function() {
        return i18n.t.apply(null,arguments);
      }

    },
    loadCatalog: function(namespace,done) {
      i18n.loadNamespace(namespace,done);
    }
  }
})();
