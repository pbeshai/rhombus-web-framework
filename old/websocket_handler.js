// ##################
// WebSocket Handler
// ##################

module.exports = {
  init: init
};

// Module dependencies
var net = require('net')
  , proxy = require('nodeproxy')

// configuration

var config = {
  clickerServer: {
    port: 4444,
    host: 'localhost',
    encoding: 'utf8'
  },
  commandRegExp: /\[([ -\w]+)\]\n/,
  errorRegExp: /\[error:([ -\w]+)\]\n/
};

// custom web socket events
var events = {
  connectClicker: "connect-clicker-server",
  disconnectClicker: "disconnect-clicker-server",
  clickData: "click-data", // for sending click data to client
  enableClicks: "enable-clicks",
  disableClicks: "disable-clicks",
  status: "status",
  webClick: "web-click" // for submitting clicks from a web clicker
};

function init(io) {
  io.sockets.on('connection', webSocketConnection);
}

// event handler for connection made to web socket
function webSocketConnection(socket) {
  console.log("[websocket connected]");
  var handler = Object.create(ClickerHandler);
  handler.init(socket);
}

var ClickerHandler = {
  socket: null,
  clickerServer: null,

  // initialize the handler (typically when a websocket connects)
  init: function (socket) {
    this.socket = socket;
    socket.on(events.connectClicker, proxy(this.clickerServerConnect, this));
    socket.on(events.disconnectClicker, proxy(this.clickerServerDisconnect, this));
    socket.on(events.enableClicks, proxy(this.enableClicks, this));
    socket.on(events.disableClicks, proxy(this.disableClicks, this));
    socket.on(events.status, proxy(this.clickerServerStatus, this));
    socket.on(events.webClick, proxy(this.webClick, this));
    socket.on("disconnect", proxy(this.webSocketDisconnect, this));
  },

  // connect to clicker server
  clickerServerConnect: function (data) {
    console.log("[connect clicker server]", this.clickerServer == null);

    if (this.clickerServer == null) {
      var socket = this.socket;
      var that = this;
      this.clickerServer = net.createConnection(config.clickerServer.port, config.clickerServer.host,
        function () {
          console.log("successfully connected to clicker server");
          socket.emit(events.connectClicker, true);
          that.clickerServerStatus();
      });
      var clickerServer = this.clickerServer;

      clickerServer.setEncoding(config.clickerServer.encoding);

      clickerServer.on("error", function (error) {
        console.log("Error with clicker server: "+error.code+ " when trying to "+error.syscall);
        socket.emit(events.connectClicker, false);
        clickerServer.destroy();
        clickerServer = null;
      });

      clickerServer.on("data", proxy(this.dataReceived, this));
    } else {
      this.socket.emit(events.connectClicker, false);
    }
  },

  // disconnect from clicker server
  clickerServerDisconnect: function (data) {
    console.log("[disconnect clicker server] ", this.clickerServer != null);

    if (this.clickerServer != null) {
      this.clickerServer.destroy();
      this.clickerServer = null;
    }

    // indicate we have disconnected.
    this.socket.emit(events.disconnectClicker, true);
  },

  // tell clicker server to start voting
  enableClicks: function () {
    console.log("[enable clicks] ", this.clickerServer != null);
    if (this.clickerServer != null) {
      this.clickerServer.write("vote start\n");
    }
  },

  // tell clicker server to stop voting
  disableClicks: function () {
    console.log("[disable clicks] ", this.clickerServer != null);
    if (this.clickerServer != null) {
      this.clickerServer.write("vote stop\n");
    }
  },

  // get the status of the clicker server
  clickerServerStatus: function () {
    console.log("[status] ", this.clickerServer != null)
    if (this.clickerServer != null) {
      this.clickerServer.write("status\n");
    }
  },

  // event handler when websocket disconnects
  webSocketDisconnect: function () {
    console.log("[websocket disconnected]");
    this.clickerServerDisconnect();
  },

  webClick: function (data) {
    console.log("[click]", this.clickerServer != null);
    if (this.clickerServer != null) {
      this.clickerServer.write("click|"+data+"\n");
    }
  },

  // event handler when clicks are received
  clicksReceived: function (data) {
    console.log("[clicks received]");
    this.socket.emit(events.clickData, { clicks: data });
  },

  dataReceived: function (data) {
    console.log("[data received]", data);

    if (data === null) {
      return;
    }

    if (data[0] !== "[") {
      return this.clicksReceived(data);
    }

    // not clicks, so either error or command response
    var error = config.errorRegExp.exec(data);
    if (error !== null) { // an error occurred
      var command = error[1];
      if (command === "vote start") {
        this.socket.emit(events.enableClicks, false);
      } else if (command === "vote stop") {
        this.socket.emit(events.disableClicks, false);
      } else if (command === "status") {
        this.socket.emit(events.status, false);
      }
      return;
    }

    // not error, so must be a command or garbage.

    // handle command response
    var command = config.commandRegExp.exec(data);
    console.log("command is ", command)
    if (command !== null) { // then command = ["[status]\n","status"]
      command = command[1];

      // status response
      if (command === "status") {
        var statusRegExp = /(\w+): ([ \w]+)/g;
        // format is Time, Instructor, Accepting Votes, #Clients

        var status = {
          time: statusRegExp.exec(data)[2],
          instructorId: statusRegExp.exec(data)[2],
          acceptingVotes: statusRegExp.exec(data)[2] === "true",
          numClients: parseInt(statusRegExp.exec(data)[2])
        };

        this.socket.emit(events.status, status)
      }
      // enable clicks response
      else if (command === "vote start") {
        this.socket.emit(events.enableClicks, true);
      }
      // disable clicks response
      else if (command === "vote stop") {
        this.socket.emit(events.disableClicks, true);
      }
    }
  }
};