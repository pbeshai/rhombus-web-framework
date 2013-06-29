// ##################
// WebSocket Handler
// ##################

module.exports = {
  init: init
};

// Module dependencies
var net = require('net'),
  _ = require('lodash'),
  ClickerServer = require("./participant_servers").ClickerServer;

// map of configured Participant Servers
var participantServers = {
  "clicker1": new ClickerServer()
};

// custom web socket events
var events = {
  connectServer: "connect-participant-server",
  disconnectServer: "disconnect-participant-server",
  choiceData: "choice-data", // for sending choice data to client
  enableChoices: "enable-choices",
  disableChoices: "disable-choices",
  status: "status",
  submitChoice: "submit-choice", // for submitting choices from a web participant
  appConfig: "app-config",
  appNext: "app-next",
  appPrev: "app-prev",
  instructorFocus: "instructor-focus"
};


function init(io) {
  console.log("initialized websocket handler");
  io.sockets.on('connection', webSocketConnection);
}

// event handler for connection made to web socket
function webSocketConnection(webSocket) {
  console.log("[websocket connected]");
  var handler = new WebSocketHandler(webSocket);
}
// collection of open websocket handlers
var openWebSockets = [];

function broadcast(event, data, exclude) {
  console.log("broadcasting to open websockets: ", event, data);
  _.each(openWebSockets, function (wsh) {
    if (wsh.id !== exclude) {
      console.log(wsh.id + " -> ", event, data);
      wsh.webSocket.emit(event, data);
    }
  });
}

function shiftInstructorFocus(id) {
  _.each(openWebSockets, function (wsh) {
    wsh.instructorFocus = (wsh.id === id);
    wsh.webSocket.emit(events.instructorFocus, wsh.instructorFocus);
  });
}

var WebSocketHandler = function (webSocket) {
  this.initialize(webSocket);
};
_.extend(WebSocketHandler.prototype, {
  webSocket: null,
  participantServer: null,
  reconnectInterval: 5000,
  reconnectTimer: null,
  instructorFocus: false,

  // initialize the handler (typically when a websocket connects)
  initialize: function (webSocket) {
    _.bindAll(this, "reconnect", "ping", "serverConnect", "serverDisconnect", "enableChoices",
      "disableChoices", "serverStatus", "submitChoice", "webSocketDisconnect", "handleParsedData",
      "appConfig", "appNext", "appPrev", "claimInstructorFocus");

    this.id = "wsh"+(new Date().getTime());
    console.log("initializing new WebSocketHandler "+this.id);

    openWebSockets.push(this);

    this.webSocket = webSocket; // the websocket
    this.participantServer = participantServers["clicker1"]; // currently always use clicker1 as the server
    this.participantServer.clients += 1;

    // auto connect
    this.serverConnect();

    // regularly ping the server to see if we are still connected.
    this.reconnectTimer = setInterval(this.reconnect, this.reconnectInterval);

    // claim instructor focus
    this.claimInstructorFocus();

    // attach websocket event handlers
    webSocket.on(events.connectServer, this.serverConnect);
    webSocket.on(events.disconnectServer, this.serverDisconnect);
    webSocket.on(events.enableChoices, this.enableChoices);
    webSocket.on(events.disableChoices, this.disableChoices);
    webSocket.on(events.status, this.serverStatus);
    webSocket.on(events.submitChoice, this.submitChoice);
    webSocket.on("disconnect", this.webSocketDisconnect);

    webSocket.on(events.appConfig, this.appConfig);
    webSocket.on(events.appNext, this.appNext);
    webSocket.on(events.appPrev, this.appPrev);
    webSocket.on(events.instructorFocus, this.claimInstructorFocus);
  },

  claimInstructorFocus: function () {
    console.log("claiming instructor focus for " + this.id);
    shiftInstructorFocus(this.id);
  },

  reconnect: function () {
    this.serverConnect(true);
  },

  appConfig: function (data) {
    console.log("appConfig", data);
    broadcast(events.appConfig, data);
  },

  appNext: function () {
    console.log("appNext");
    broadcast(events.appNext);
  },

  appPrev: function () {
    console.log("appPrev");
    broadcast(events.appPrev);
  },

  // connect to participant server
  serverConnect: function (autoreconnect) {
    if (!this.participantServer.isConnected()) {
      console.log(this.id +" attempting connection (connecting="+this.participantServer.connecting+")");
      if (!this.participantServer.connecting) { //only let one person try and connect
        console.log("connecting to socket "+this.id);
        this.participantServer.connecting = true;
        var webSocket = this.webSocket;
        var that = this;

        // connect via socket to participant server and get status on connection
        this.participantServer.socket = net.createConnection(this.participantServer.port, this.participantServer.host,
          function () {
            console.log("successfully connected to participant server ("+that.id+")");
            webSocket.emit(events.connectServer, true);
            that.serverStatus();
            that.participantServer.connecting = false;
        });
        var participantServer = this.participantServer;
        participantServer.socket.setEncoding(this.participantServer.encoding);

        // error handler
        participantServer.socket.on("error", function (error) {
          console.log("Error with participant server: "+error.code+ " when trying to "+error.syscall);
          if (participantServer.isConnected()) { // only let websocket know if we had and lost connection to the server
            broadcast(events.connectServer, false);
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
        this.serverStatus(); // this could spam statuses on reconnects... but it's a simple fix
        //this.participantServer.socket.on("data", this.dataReceived);
        this.participantServer.addListener(this.id, this.handleParsedData);

        this.webSocket.emit(events.connectServer, true);
      } else if (!autoreconnect) {

        console.log("already connected on "+this.id);
        // already connected and listening
        this.webSocket.emit(events.connectServer, true);
      }
    } else {
      // not connected, but in the process of connecting.
      this.webSocket.emit(events.connectServer, false);
    }
  },

  // disconnect from participant server
  serverDisconnect: function () {
    console.log("[disconnect participant server] ", this.participantServer.socket != null);


    this.participantServer.disconnect();

    // indicate we have disconnected.
    this.webSocket.emit(events.disconnectServer, true);
  },

  // event handler when websocket disconnects
  webSocketDisconnect: function () {
    console.log("[websocket disconnected]");

    this.participantServer.removeListener[this.id];
    this.participantServer.clients -= 1;
    clearInterval(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.participantServer.clients === 0) {
      this.serverDisconnect();
    }

    this.webSocket = null;
    // remove from openWebSockets
    openWebSockets = _.reject(openWebSockets, function (wsh) {
      return wsh.id == this.id;
    }, this);
  },

  ping: function () {
    console.log("ping");
    if (this.participantServer.isConnected()) {
      this.participantServer.command("ping");
    } else {
      this.serverConnect(); // attempt auto-reconnect
    }
  },

  // tell participant server to start voting
  enableChoices: function () {
    this.participantServer.command("enableChoices");
  },

  // tell participant server to stop voting
  disableChoices: function () {
    this.participantServer.command("disableChoices");
  },

  // get the status of the participant server
  serverStatus: function () {
    this.participantServer.command("status");
  },

  submitChoice: function (data) {
    this.participantServer.command("submitChoice", [data]);
  },

  // event handler when choices are received. data of the form "<ID>:<Choice> ..."
  // e.g., "174132:A" or "174132:A 832185:B 321896:E"
  choicesReceived: function (data) {
    console.log("[choices received]", data);

    // TODO: filter out instructor clicks if we do not have instructorFocus?
    // currently we trust the client side to ignore them if they do not
    // have instructor focus. Works for now, but could be reconsidered.

    this.webSocket.emit(events.choiceData, { choices: data });
  },

  handleParsedData: function (result) {
    if (this.webSocket == null) { //web socket has closed, ignore this
      return;
    }
    // garbage data?
    if (result == null) {
      return;
    }

    // did an error occur?
    if (result.error) {
      if (result.command) {
        this.webSocket.emit(events[result.command], result);
      }
    } else if (result.command) {   // is it a command callback?
      if (events[result.command]) {
        this.webSocket.emit(events[result.command], result.data);
      }
    } else { // must have been choices.
      this.choicesReceived(result.data);
    }
  }
});