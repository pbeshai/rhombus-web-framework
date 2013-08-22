module.exports = {
  Manager: Manager,
  WebSocketHandler: WebSocketHandler,
  ControllerWSH: ControllerWSH,
  ViewerWSH: ViewerWSH
};
var debug = false;

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
  instructorFocus: "instructor-focus",
  viewerConnect: "viewer-connect",
  viewerDisconnect: "viewer-disconnect",
  viewerList: "viewer-list",
  registered: "registered",
  loadView: "load-view",
  updateView: "update-view"
};

function Manager(id) {
  this.id = id;
  this.viewers = [];      // collection of ViewerWSH
  this.controller = null; // ControllerWSH
  // turn off reconnect currently while testing
  this.participantServerHandler = new ManagerParticipantServerHandler(this, participantServers.clicker, { reconnect: false });
};
_.extend(Manager.prototype, {
  addViewer: function (viewer) {
    viewer.on("disconnect", _.bind(this.removeViewer, this, viewer));  // remove on disconnect
    this.viewers.push(viewer);

    if (this.controller) {
      this.controller.sendViewerConnected(viewer);
    }

    viewer.sendRegistered();
  },

  removeViewer: function (viewer) {
    var i = _.indexOf(this.viewers, viewer);
    if (i !== -1) { // remove it from the array by swapping with last element in array
      this.viewers[i] = this.viewers[this.viewers.length - 1];
      this.viewers.length -= 1;
    }

    if (this.controller) {
      this.controller.sendViewerDisconnected(viewer);
    }
  },

  setController: function (controller) {
    if (controller) {
      controller.on("disconnect", _.bind(this.setController, this)); // remove on disconnect
      controller.sendRegistered();
      controller.sendViewerList(this.viewers);
      if (this.participantServerHandler.isConnected()) {
        controller.serverConnected(true);
        this.participantServerHandler.runCommand("status");
      }

    }

    this.controller = controller;
  },

  // viewers send to controller
  appMessageFromViewer: function (message, viewer) {
    console.log("Manager got message from viewer ", message);
    if (!this.controller) return;
    console.log("sending message to " + this.controller);
    this.controller.sendAppMessage(message);
  },

  // controller sends to viewers
  appMessageFromController: function (message) {
    console.log("Manager got message from controller ", message);

    // TODO: Debugging
    if (debug) {
      if (message.type === "load-view") {
        if (message.message.options.participants) {
          _.each(message.message.options.participants, function (p) {
            console.log(p);
          });
        }
      } else if (message.type === "update-view") {
        if (message.message.participants) {
          _.each(message.message.participants, function (p) {
            console.log(p);
          });
        }
      }
    }

    _.each(this.viewers, function (viewer) {
      if (!message.viewer || viewer.id === message.viewer) {
        console.log("sending message to " + viewer);
        viewer.sendAppMessage(message);
      }
    });
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

function ManagerParticipantServerHandler(manager, participantServer, options) {
  this.initialize(manager, participantServer, options);
};
_.extend(ManagerParticipantServerHandler.prototype, {
  webSocket: null,
  reconnectInterval: 5000,
  reconnectTimer: null,
  instructorFocus: false,

  // initialize the handler (typically when a websocket connects)
  initialize: function (manager, participantServer, options) {
    this.options = (options || (options = {}));
    console.log("initializing manager participant server handler");
    _.bindAll(this, "reconnect", "serverConnect", "serverDisconnect", "handleParsedData");

    this.manager = manager;

    this.participantServer = participantServer;
    this.participantServer.clients += 1;

    // auto connect
    this.serverConnect();

    if (options.reconnect !== false) {
      // regularly ping the server to see if we are still connected.
      this.reconnectTimer = setInterval(this.reconnect, this.reconnectInterval);
    }
  },

  reconnect: function () {
    this.serverConnect(true);
  },

  isConnected: function () {
    return this.participantServer.isConnected();
  },

  // TODO: potentially simplify this/ handle when controller reconnects or a new controller attaches to the manager

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
            that.manager.serverConnected(true);
            that.runCommand("status");
            that.participantServer.connecting = false;
        });
        var participantServer = this.participantServer;
        participantServer.socket.setEncoding(this.participantServer.encoding);

        // error handler
        participantServer.socket.on("error", function (error) {
          console.log("Error with participant server: "+error.code+ " when trying to "+error.syscall);
          if (participantServer.isConnected()) { // only let websocket know if we had and lost connection to the server
            _.each(runningManagers, function (manager) {
              manager.serverConnected(false);
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
        this.manager.serverConnected(true);
      } else if (!autoreconnect) {

        console.log("already connected on "+this.id);
        // already connected and listening
        this.manager.serverConnected(true);
      }
    } else {
      // not connected, but in the process of connecting.
      this.manager.serverConnected(false);
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
      this.manager.errorReceived(result);
    } else if (result.command) {   // is it a command callback?
      this.manager.commandReceived(result);
    } else { // must have been choices.
      this.manager.choicesReceived(result.data);
    }
  }
});


function WebSocketHandler(webSocket, manager, name) {
  EventEmitter.call(this);
  this.initialize.apply(this, arguments);
};
util.inherits(WebSocketHandler, EventEmitter);
_.extend(WebSocketHandler.prototype, {
  webSocket: null,
  webSocketEvents: [
    { event: webSocketEvents.appMessage, handler: "appMessageReceived" },
    { event: "disconnect", handler: "webSocketDisconnect" }
  ],

  toString: function () {
    if (this.name) {
      return this.id + ":" + this.name;
    }

    return this.id;
  },

  toJSON: function () {
    return { id: this.id, name: this.name };
  },

  generateId: function () {
    return "WSH"+(new Date().getTime());
  },

  // initialize the handler (typically when a websocket connects)
  initialize: function (webSocket, manager, name) {
    var boundFunctions = _.pluck(this.webSocketEvents, "handler");
    _.bindAll.apply(this, [this].concat(boundFunctions));

    this.id = this.generateId();
    console.log("initializing new handler " + this);

    this.manager = manager;
    this.name = name;

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

  sendAppMessage: function (message) {
    this.sendMessage(webSocketEvents.appMessage, message);
  },

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


var idLimit = 1000; // simple limit of IDs to 1000.
var viewerIdCount = 1;
function ViewerWSH(webSocket, manager) {
  WebSocketHandler.apply(this, arguments);
}
util.inherits(ViewerWSH, WebSocketHandler);
_.extend(ViewerWSH.prototype, {
  generateId: function () {
    if (viewerIdCount > idLimit) viewerIdCount = 1;
    return "Viewer"+(viewerIdCount++);
  },

  appMessageReceived: function (message) {
    this.manager.appMessageFromViewer(message, this);
  },

  sendRegistered: function () {
    this.sendMessage(webSocketEvents.registered, { type: "viewer", id: this.id, name: this.name });
  }
});

var controllerIdCount = 1;
function ControllerWSH(webSocket, manager) {
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
    if (controllerIdCount > idLimit) controllerIdCount = 1;
    return "Controller"+(controllerIdCount++);
  },

  // message came in over websocket
  appMessageReceived: function (message) {
    this.manager.appMessageFromController(message);
  },

  // tell participant server to start voting
  enableChoicesReceived: function () {
    this.manager.runServerCommand("enableChoices");
  },

  // tell participant server to stop voting
  disableChoicesReceived: function () {
    this.manager.runServerCommand("disableChoices");
  },

  // get the status of the participant server
  serverStatusReceived: function () {
    this.manager.runServerCommand("status");
  },

  submitChoiceReceived: function (data) {
    this.manager.runServerCommand("submitChoice", [data]);
  },

  sendViewerConnected: function (viewer) {
    this.sendMessage(webSocketEvents.viewerConnect, viewer.toJSON());
  },

  sendViewerDisconnected: function (viewer) {
    this.sendMessage(webSocketEvents.viewerDisconnect, viewer.toJSON());
  },

  sendViewerList: function (viewers) {
    var jsonViewers = _.map(viewers, function (v) {
      return v.toJSON();
    });

    this.sendMessage(webSocketEvents.viewerList, { viewers: jsonViewers });
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
  },

  sendRegistered: function () {
    this.sendMessage(webSocketEvents.registered, { type: "controller", id: this.id });
  }
});
/* these should be added to controller that then tells the Manager what to do
    // attach websocket event handlers
    webSocket.on(webSocketEvents.managerConfig, this.managerConfig);
    webSocket.on(webSocketEvents.managerNext, this.managerNext);
    webSocket.on(webSocketEvents.managerPrev, this.managerPrev);
    webSocket.on(webSocketEvents.instructorFocus, this.claimInstructorFocus);
*/