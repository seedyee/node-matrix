RED.comms = (function() {

  var errornotification = null;
  var clearErrorTimer = null;
  var connectCountdownTimer = null;
  var connectCountdown = 10;
  var subscriptions = {};
  var ws;
  var pendingAuth = false;
  var reconnectAttempts = 0;
  var active = false;

  function connectWS() {
    active = true;
    var path = location.hostname;
    var port = location.port;
    if (port.length !== 0) {
      path = path+":"+port;
    }
    path = path+document.location.pathname;
    path = path+(path.slice(-1) == "/"?"":"/")+"comms";
    path = "ws"+(document.location.protocol=="https:"?"s":"")+"://"+path;

    var auth_tokens = RED.settings.get("auth-tokens");
    pendingAuth = (auth_tokens!=null);

    function completeConnection() {
      for (var t in subscriptions) {
        if (subscriptions.hasOwnProperty(t)) {
          ws.send(JSON.stringify({subscribe:t}));
        }
      }
    }

    ws = new WebSocket(path);
    ws.onopen = function() {
      reconnectAttempts = 0;
      if (errornotification) {
        clearErrorTimer = setTimeout(function() {
          errornotification.close();
          errornotification = null;
        },1000);
      }
      if (pendingAuth) {
        ws.send(JSON.stringify({auth:auth_tokens.access_token}));
      } else {
        completeConnection();
      }
    }
    ws.onmessage = function(event) {
      var msg = JSON.parse(event.data);
      if (pendingAuth && msg.auth) {
        if (msg.auth === "ok") {
          pendingAuth = false;
          completeConnection();
        } else if (msg.auth === "fail") {
          // anything else is an error...
          active = false;
          RED.user.login({updateMenu:true},function() {
            connectWS();
          })
        }
      } else if (msg.topic) {
        for (var t in subscriptions) {
          if (subscriptions.hasOwnProperty(t)) {
            var re = new RegExp("^"+t.replace(/([\[\]\?\(\)\\\\$\^\*\.|])/g,"\\$1").replace(/\+/g,"[^/]+").replace(/\/#$/,"(\/.*)?")+"$");
            if (re.test(msg.topic)) {
              var subscribers = subscriptions[t];
              if (subscribers) {
                for (var i=0;i<subscribers.length;i++) {
                  subscribers[i](msg.topic,msg.data);
                }
              }
            }
          }
        }
      }
    };
    ws.onclose = function() {
      if (!active) {
        return;
      }
      if (clearErrorTimer) {
        clearTimeout(clearErrorTimer);
        clearErrorTimer = null;
      }
      reconnectAttempts++;
      if (reconnectAttempts < 10) {
        setTimeout(connectWS,1000);
        if (reconnectAttempts > 5 && errornotification == null) {
          errornotification = RED.notify(RED._("notification.errors.lostConnection"),"error",true);
        }
      } else if (reconnectAttempts < 20) {
        setTimeout(connectWS,2000);
      } else {
        connectCountdown = 60;
        connectCountdownTimer = setInterval(function() {
          connectCountdown--;
          if (connectCountdown === 0) {
            errornotification.update(RED._("notification.errors.lostConnection"));
            clearInterval(connectCountdownTimer);
            connectWS();
          } else {
            var msg = RED._("notification.errors.lostConnectionReconnect",{time: connectCountdown})+' <a href="#">'+ RED._("notification.errors.lostConnectionTry")+'</a>';
            errornotification.update(msg);
            $(errornotification).find("a").click(function(e) {
              e.preventDefault();
              errornotification.update(RED._("notification.errors.lostConnection"));
              clearInterval(connectCountdownTimer);
              connectWS();
            })
          }
        },1000);
      }

    }
  }

  function subscribe(topic,callback) {
    if (subscriptions[topic] == null) {
      subscriptions[topic] = [];
    }
    subscriptions[topic].push(callback);
    if (ws && ws.readyState == 1) {
      ws.send(JSON.stringify({subscribe:topic}));
    }
  }

  function unsubscribe(topic,callback) {
    if (subscriptions[topic]) {
      for (var i=0;i<subscriptions[topic].length;i++) {
        if (subscriptions[topic][i] === callback) {
          subscriptions[topic].splice(i,1);
          break;
        }
      }
      if (subscriptions[topic].length === 0) {
        delete subscriptions[topic];
      }
    }
  }

  return {
    connect: connectWS,
    subscribe: subscribe,
    unsubscribe:unsubscribe
  }
})();
