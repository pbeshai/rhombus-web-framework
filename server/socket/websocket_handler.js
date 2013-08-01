// ##################
// WebSocket Handler
// ##################

module.exports = {
  init: init
};

// Module dependencies
var net = require('net'),
  _ = require('lodash'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter,
  ClickerServer = require("./participant_servers").ClickerServer;

// map of configured Participant Servers
var participantServers = {
  "clicker": new ClickerServer()
};

// custom web socket events
var webSocketEvents = {
  connectServer: "connect-participant-server",
  choiceData: "choice-data", // for sending choice data to client
  enableChoices: "enable-choices",
  disableChoices: "disable-choices",
  status: "status",
  submitChoice: "submit-choice", // for submitting choices from a web participant
  appMessage: "app-message",
  instructorFocus: "instructor-focus"
};


function init(io) {
  console.log("initialized websocket handler");
  io.sockets.on('connection', webSocketConnection);
}

var runningApps = {};

function App(id) {
  this.id = id;
  this.viewers = [];      // collection of ViewerWSH
  this.controller = null; // ControllerWSH
  this.participantServerHandler = new AppParticipantServerHandler(this, participantServers.clicker);
};
_.extend(App.prototype, {
  addViewer: function (viewer) {
    viewer.on("disconnect", _.bind(this.removeViewer, this, [viewer]));  // remove on disconnect
    this.viewers.push(viewer);
  },

  removeViewer: function (viewer) {
    console.log("TODO remove viewer", viewer);
  },

  messageFromViewer: function (message) {
    console.log("TODO: App got message from viewer ", message);
  },

  setController: function (controller) {
    if (controller) controller.on("disconnect", _.bind(this.setController, this)); // remove on disconnect
    this.controller = controller;
  },

  messageFromController: function (message) {
    console.log("TODO: app message from controller", message);
  },

  runServerCommand: function (command, args) {
    this.participantServerHandler.runCommand(command, args);
  },

  serverConnected: function (connected) {
    if (!this.controller) return;
    this.controller.serverConnected(connected);
  },

  // from the participant server
  choicesReceived: function (data) {
    if (!this.controller) return;
    this.controller.sendChoices(data);
  },

  errorReceived: function (error) {
    if (!this.controller) return;
    if (error.command) {
      this.controller.sendCommandError(error);
    }
  },

  commandReceived: function (command) {
    if (!this.controller) return;
    this.controller.sendCommand(command);
  }
});

// creates a new app if one does not exist, or returns the one that maps to the id
function getApp(id) {
  var app = runningApps[id];
  if (app === undefined) {
    app = runningApps[id] = new App(id);
  }
  return app;
}


// event handler for connection made to web socket
function webSocketConnection(webSocket) {
  console.log("[websocket connected]");
  webSocket.emit("request-register"); // ask the websocket connectee to introduce itself
  webSocket.on("register", function (data) {
    var app = getApp(data.app);
    console.log("websocket register", data);
    if (data.type === "controller") {
      console.log("registering new controller");
      app.setController(new ControllerWSH(webSocket, app));
    } else {
      console.log("registering new viewer");
      app.addViewer(new ViewerWSH(webSocket, app));
    }
  });
}
// collection of open websocket handlers
// var openWebSockets = [];

// function broadcast(event, data, exclude) {
//   console.log("broadcasting to open websockets: ", event, data);
//   _.each(openWebSockets, function (wsh) {
//     if (wsh.id !== exclude) {
//       console.log(wsh.id + " -> ", event, data);
//       wsh.webSocket.emit(event, data);
//     }
//   });
// }

// function shiftInstructorFocus(id) {
//   _.each(openWebSockets, function (wsh) {
//     wsh.instructorFocus = (wsh.id === id);
//     wsh.webSocket.emit(webSocketEvents.instructorFocus, wsh.instructorFocus);
//   });
// }
// new AppParticipantServerHandler(app, participantServers.clicker);

var AppParticipantServerHandler = function (app, participantServer) {
  this.initialize(app, participantServer);
};
_.extend(AppParticipantServerHandler.prototype, {
  webSocket: null,
  reconnectInterval: 5000,
  reconnectTimer: null,
  instructorFocus: false,

  // initialize the handler (typically when a websocket connects)
  initialize: function (app, participantServer) {
    console.log("initializing app participant server handler");
    _.bindAll(this, "reconnect", "serverConnect", "serverDisconnect", "handleParsedData");

    this.app = app;

    this.participantServer = participantServer;
    this.participantServer.clients += 1;

    // auto connect
    this.serverConnect();

    // regularly ping the server to see if we are still connected.
    this.reconnectTimer = setInterval(this.reconnect, this.reconnectInterval);
  },

  reconnect: function () {
    this.serverConnect(true);
  },

  // connect to participant server
  serverConnect: function (autoreconnect) {
    if (!this.participantServer.isConnected()) {
      console.log(this.id +" attempting connection (connecting="+this.participantServer.connecting+")");
      if (!this.participantServer.connecting) { //only let one person try and connect
        console.log("connecting to socket "+this.id);
        this.participantServer.connecting = true;
        var that = this;

        // connect via socket to participant server and get status on connection
        this.participantServer.socket = net.createConnection(this.participantServer.port, this.participantServer.host,
          function () {
            console.log("successfully connected to participant server ("+that.id+")");
            that.app.serverConnected(true);
            that.runCommand("status");
            that.participantServer.connecting = false;
        });
        var participantServer = this.participantServer;
        participantServer.socket.setEncoding(this.participantServer.encoding);

        // error handler
        participantServer.socket.on("error", function (error) {
          console.log("Error with participant server: "+error.code+ " when trying to "+error.syscall);
          if (participantServer.isConnected()) { // only let websocket know if we had and lost connection to the server
            _.each(runningApps, function (app) {
              app.serverConnected(false);
            });
          }
          participantServer.disconnect();
          that.participantServer.connecting = false;
        });

        // attach handler for when data is sent across socket
        participantServer.socket.on("data", _.bind(participantServer.dataReceived, participantServer));
        console.log("adding data listener "+this.id);
        participantServer.addListener(this.id, this.handleParsedData);
      }
    } else if (!this.participantServer.isConnecting()) {
      if (!this.participantServer.isListening(this.id)) {
        // socket connected, but this websocket handler is not listening for data events
        // attach handler for when data is sent across socket
        console.log("adding data listener "+this.id);
        this.runCommand("status"); // this could spam statuses on reconnects... but it's a simple fix
        //this.participantServer.socket.on("data", this.dataReceived);
        this.participantServer.addListener(this.id, this.handleParsedData);
        this.app.serverConnected(true);
      } else if (!autoreconnect) {

        console.log("already connected on "+this.id);
        // already connected and listening
        this.app.serverConnected(true);
      }
    } else {
      // not connected, but in the process of connecting.
      this.app.serverConnected(false);
    }
  },

  ping: function () {
    if (this.participantServer.isConnected()) {
      this.participantServer.command("ping");
    } else {
      this.serverConnect(); // attempt auto-reconnect
    }
  },

  runCommand: function (command, args) {
    this.participantServer.command(command, args);
  },

  handleParsedData: function (result) {
    // garbage data?
    if (result == null) {
      return;
    }

    // did an error occur?
    if (result.error) {
      this.app.errorReceived(result);
    } else if (result.command) {   // is it a command callback?
      this.app.commandReceived(result);
    } else { // must have been choices.
      this.app.choicesReceived(result.data);
    }
  }
});


var WebSocketHandler = function (webSocket, app) {
  EventEmitter.call(this);
  this.initialize(webSocket, app);
};
util.inherits(WebSocketHandler, EventEmitter);
_.extend(WebSocketHandler.prototype, {
  webSocket: null,
  webSocketEvents: [
    { event: webSocketEvents.appMessage, handler: "appMessageReceived" },
    { event: "disconnect", handler: "webSocketDisconnect" }
  ],

  toString: function () {
    return this.id;
  },

  generateId: function () {
    return "WSH"+(new Date().getTime());
  },

  // initialize the handler (typically when a websocket connects)
  initialize: function (webSocket, app) {
    var boundFunctions = _.pluck(this.webSocketEvents, "handler");
    _.bindAll.apply(this, [this].concat(boundFunctions));

    this.id = this.generateId();
    console.log("initializing new handler " + this);

    this.app = app;

    // attach websocket event handlers
    this.webSocket = webSocket; // the websocket
    _.each(this.webSocketEvents, function (eventDef) {
      var handler = eventDef.handler;
      if (_.isString(handler)) {
        handler = this[handler];
      }

      webSocket.on(eventDef.event, handler);
    }, this);
  },

  appMessageReceived: function (message) { },

  // sends a message over the websocket
  sendMessage: function (type, message) {
    if (this.webSocket) {
      this.webSocket.emit(type, message);
    }
  },

  // event handler when websocket disconnects (basically a destructor)
  webSocketDisconnect: function () {
    console.log("[websocket disconnected] " + this);
    this.webSocket = null;
    this.emit("disconnect");
  },
});

var ViewerWSH = function (webSocket, app) {
  WebSocketHandler.apply(this, arguments);
}
util.inherits(ViewerWSH, WebSocketHandler);
_.extend(ViewerWSH.prototype, {
  generateId: function () {
    return "ViewerWSH"+(new Date().getTime());
  },

  appMessageReceived: function (message) {
    this.app.messageFromViewer(message);
  },
});

var ControllerWSH = function (webSocket, app) {
  WebSocketHandler.apply(this, arguments);
};
util.inherits(ControllerWSH, WebSocketHandler);
_.extend(ControllerWSH.prototype, {
  webSocketEvents: WebSocketHandler.prototype.webSocketEvents.concat([
    { event: webSocketEvents.enableChoices, handler: "enableChoicesReceived" },
    { event: webSocketEvents.disableChoices, handler: "disableChoicesReceived" },
    { event: webSocketEvents.serverStatus, handler: "serverStatusReceived" },
    { event: webSocketEvents.submitChoice, handler: "submitChoiceReceived" },
  ]),

  generateId: function () {
    return "ControllerWSH"+(new Date().getTime());
  },

  // message came in over websocket
  appMessageReceived: function (message) {
    this.app.messageFromController(message);
  },

  // tell participant server to start voting
  enableChoicesReceived: function () {
    this.app.runServerCommand("enableChoices");
  },

  // tell participant server to stop voting
  disableChoicesReceived: function () {
    this.app.runServerCommand("disableChoices");
  },

  // get the status of the participant server
  serverStatusReceived: function () {
    this.app.runServerCommand("status");
  },

  submitChoiceReceived: function (data) {
    this.app.runServerCommand("submitChoice", [data]);
  },

  serverConnected: function (connected) {
    this.sendMessage(webSocketEvents.connectServer, connected);
  },

  sendChoices: function (data) {
    this.sendMessage(webSocketEvents.choiceData, { choices: data });
  },

  sendCommandError: function (error) {
    this.sendMessage(webSocketEvents[error.command], error);
  },

  sendCommand: function (command) {
    if (webSocketEvents[command.command]) {
      this.sendMessage(webSocketEvents[command.command], command.data);
    }
  }
});
/* these should be added to controller that then tells the App what to do
    // attach websocket event handlers
    webSocket.on(webSocketEvents.appConfig, this.appConfig);
    webSocket.on(webSocketEvents.appNext, this.appNext);
    webSocket.on(webSocketEvents.appPrev, this.appPrev);
    webSocket.on(webSocketEvents.instructorFocus, this.claimInstructorFocus);
*/