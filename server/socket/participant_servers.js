
var _ = require('lodash')
  , aliasFilter = require('./filters/alias_filter')
  , async = require('async');

var ParticipantServer = {
  dataFilters: [],
  encoding: "utf8",
  socket: null,
  port: 4444,
  host: "localhost",
  commandRegExp: /\[([ -\w]+)\]\n/,
  errorRegExp: /\[error:([ -\w]+)\]\n/,
  clients: 0, // keep track of number of clients to know if we should close socket to server
  pingInterval: 5000, // in milliseconds
  listeners: {}, // websocketHandler id : true if events bound to current socket
  connecting: false, // set to true when attempting to connect
  commands: {
  /*  enableChoices: "",
    disableChoices: "",
    status: "",
    ping: "",
    submitChoice: function (data) { return ""; }
  */
  },

  // converts a command string to an event (only works for string commands currently)
  commandKey: function (command) {
    var commands = this.commands;
    var commandKey = _.find(_.keys(commands), function (key) { return commands[key] === command });
    return commandKey;
  },

  isConnected: function () {
    return this.socket != null;
  },

  checkConnection: function () {
    if (this.isConnected()) {
      // ping to see if it still is connected.
      this.socket.write(this.commands.ping + "\n");

      // an error will occur on the socket if not connected
      // (handled elsewhere via socket.on("error") ...)
    }
  },

  disconnect: function () {
    if (this.socket != null) {
      this.socket.destroy();
      this.socket = null;
    }
    // reset listeners
    this.listeners = {};
  },

  // event handling
  addListener: function (id, callback) {
    this.listeners[id] = { listening: this.isConnected(), callback: callback };
  },

  isListening: function (id) {
    return this.listeners[id] !== undefined && this.listeners[id].listening === true;
  },

  removeListener: function (id) {
    delete this.listeners[id];
  },

  dataReceived: function (data) {
    // must use callback since parseData may make use of asynchronous calls
    this.parseData(data, _.bind(this.handleParsedData, this));
  },

  handleParsedData: function (result) {
    // call all the listeners
    _.each(this.listeners, function (listener) {
      listener.callback(result);
    });
  },

  // data of form { data: [ {id: xxx, choice: A}, ... ] }
  filterData: function (data, callback) {
    async.eachSeries(this.dataFilters, function (filter, loopCallback) {
      filter.filter(data, loopCallback);
    }, function (err) {
      callback(data);
    });
  }
};

// default configuration for Clicker Servers
var ClickerServer = _.extend({}, ParticipantServer, {
    dataFilters: [ aliasFilter ],
    commands: {
      enableChoices: "vote start",
      disableChoices: "vote stop",
      ping: "ping",
      status: "status",
      submitChoice: function (data) { return "click" + ((data !== undefined) ? "|"+data : ""); }
    },

    // takes in data from the server and outputs an object of form:
    //   { error: bool, command: str, data: * } or undefined if no valid data
    parseData: function (data, callback) {
      if (data === null) {
        return callback();
      }

      // TODO: migrating over to JSON responses
      try {
        var jsonData = JSON.parse(data);

        // if this succeeds, it is data.
        return this.filterData({ data: jsonData}, callback);
      } catch (e) { }


      // not choices, so either error or command response
      var error = this.errorRegExp.exec(data);
      if (error !== null) { // an error occurred
        return callback({ error: true, command: this.commandKey(error[1]), data: false });
      }

      // not error, so must be a command or garbage.

      // handle command response
      var command = this.commandRegExp.exec(data);
      if (command !== null) { // then command = ["[status]\n","status"]
        command = command[1];
        var data;

        // status response
        if (command === this.commands.status) {
          var statusRegExp = /(\w+): ([ \w]+)/g;
          // format is Time, Instructor, Accepting Votes, #Clients

          var status = {
            time: statusRegExp.exec(data)[2],
            instructorId: statusRegExp.exec(data)[2],
            acceptingChoices: statusRegExp.exec(data)[2] === "true",
            numClients: parseInt(statusRegExp.exec(data)[2])
          };

          data = status;
        }

        // enable choices response
        else if (command === this.commands.enableChoices) {
          data = true;
        }

        // disable choices response
        else if (command === this.commands.disableChoices) {
          data = true;
        }

        return callback({ command: this.commandKey(command), data: data });
      }

      // must have been garbage, return undefined
      return callback();
    }
  });

// setup regular checking of clickerserver
setInterval(_.bind(ClickerServer.checkConnection, ClickerServer), ClickerServer.pingInterval);

// map of configured Participant Servers
var participantServers = {
  "clicker1": ClickerServer
};

module.exports = {
  ParticipantServer: ParticipantServer,
  ClickerServer: ClickerServer,
  serverMap: participantServers
};