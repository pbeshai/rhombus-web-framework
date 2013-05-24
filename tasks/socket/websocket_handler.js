// ##################
// WebSocket Handler
// ##################

module.exports = {
  init: init
};

// Module dependencies
var net = require('net')
  , _ = require('lodash'),
  participantServers = require("./participant_servers").serverMap;

// custom web socket events
var events = {
  connectServer: "connect-participant-server",
  disconnectServer: "disconnect-participant-server",
  choiceData: "choice-data", // for sending choice data to client
  enableChoices: "enable-choices",
  disableChoices: "disable-choices",
  status: "status",
  submitChoice: "submit-choice" // for submitting choices from a web participant
};


function init(io) {
  console.log("initialized websocket handler");
  io.sockets.on('connection', webSocketConnection);
}

// event handler for connection made to web socket
function webSocketConnection(webSocket) {
  console.log("[websocket connected]");
  var handler = Object.create(WebSocketHandler);
  handler.initialize(webSocket);
}

var WebSocketHandler = {
  webSocket: null,
  participantServer: null,

  // initialize the handler (typically when a websocket connects)
  initialize: function (webSocket) {
    _.bindAll(this, "serverConnect", "serverDisconnect", "enableChoices",
      "disableChoices", "serverStatus", "webChoice", "webSocketDisconnect");

    this.webSocket = webSocket; // the websocket
    this.participantServer = participantServers["clicker1"]; // currently always use clicker1 as the server

    webSocket.on(events.connectServer, this.serverConnect);
    webSocket.on(events.disconnectServer, this.serverDisconnect);
    webSocket.on(events.enableChoices, this.enableChoices);
    webSocket.on(events.disableChoices, this.disableChoices);
    webSocket.on(events.status, this.serverStatus);
    webSocket.on(events.submitChoice, this.submitChoice);
    webSocket.on("disconnect", this.webSocketDisconnect);
  },

  // connect to participant server
  serverConnect: function (data) {
    console.log("[connect participant server]", this.participantServer.socket == null);

    if (this.participantServer.socket == null) {
      var webSocket = this.webSocket;
      var that = this;

      // connect via socket to participant server and get status on connection
      this.participantServer.socket = net.createConnection(this.participantServer.port, this.participantServer.host,
        function () {
          console.log("successfully connected to participant server");
          webSocket.emit(events.connectServer, true);
          that.participantServerStatus();
      });
      var participantServer = this.participantServer;
      participantServer.socket.setEncoding(this.participantServer.encoding);

      // error handler
      participantServer.socket.on("error", function (error) {
        console.log("Error with participant server: "+error.code+ " when trying to "+error.syscall);
        webSocket.emit(events.connectServer, false);
        participantServer.socket.destroy();
        participantServer.socket = null;
      });

      // attach handler for when data is sent across socket
      participantServer.socket.on("data", _.bind(this.dataReceived, this));
    } else {
      this.webSocket.emit(events.connectServer, false);
    }
  },

  // disconnect from participant server
  serverDisconnect: function (data) {
    console.log("[disconnect participant server] ", this.participantServer.socket != null);

    if (this.participantServer.socket != null) {
      this.participantServer.socket.destroy();
      this.participantServer.socket = null;
    }

    // indicate we have disconnected.
    this.webSocket.emit(events.disconnectServer, true);
  },

  // event handler when websocket disconnects
  webSocketDisconnect: function () {
    console.log("[websocket disconnected]");
    // TODO: shouldn't do this if other sockets are still connected.
    this.serverDisconnect();
  },

  // generic server command function
  serverCommand: function (command, args) {
    console.log("[" + command + "] ", this.participantServer.socket != null);

    if (this.participantServer.socket != null) {
      var serverCommand = this.participantServer.commands[command] // can be string or function
      if (_.isFunction(serverCommand)) { // if function, evaluate to string
        serverCommand = serverCommand.apply(this, args);
      }

      // output across socket
      this.participantServer.socket.write(serverCommand + "\n");
    }
  },

  // tell participant server to start voting
  enableChoices: function () {
    this.serverCommand("enableChoices");
  },

  // tell participant server to stop voting
  disableChoices: function () {
    this.serverCommand("disableChoices");
  },

  // get the status of the participant server
  participantServerStatus: function () {
    this.serverCommand("status");
  },

  submitChoice: function (data) {
    this.serverCommand("submitChoice", data);
  },

  // event handler when choices are received
  choicesReceived: function (data) {
    console.log("[choices received]");
    this.webSocket.emit(events.choiceData, { choices: data });
  },

  dataReceived: function (data) {
    console.log("[data received]", data);

    var result = this.participantServer.parseData(data);
    console.log("parsed result is: ", result);
    // garbage data?
    if (result == null) {
      return;
    }

    // did an error occur?
    if (result.error) {
      if (result.command) {
        this.webSocket.emit(events[result.command], { error: true, data: result.data });
      }
    } else if (result.command) {   // is it a command callback?
      this.webSocket.emit(events[result.command], result.data);
    } else { // must have been choices.
      this.choicesReceived(result.data);
    }
  }
};