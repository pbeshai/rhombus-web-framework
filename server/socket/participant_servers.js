
var _ = require('lodash')
//  , AliasFilter = require('./filters/alias_filter').AliasFilter
	, async = require('async')
	, logger = require("../../../log/logger");

//var aliasFilter = new AliasFilter();

var ParticipantServer = function (options) {
	this.initialize(options);
};
_.extend(ParticipantServer.prototype, {
	name: "ParticipantServer",
	dataFilters: [],
	encoding: "utf8",
	socket: null,
	port: 4445,
	host: "localhost",
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

	initialize: function (options) {
		_.extend(this, options); // integrate the options
	},

	// converts a command string to an event (only works for string commands currently)
	commandKey: function (command) {
		var commands = this.commands;
		var commandKey = _.find(_.keys(commands), function (key) { return commands[key] === command; });
		return commandKey;
	},

	isConnecting: function () {
		return this.connecting;
	},

	isConnected: function () {
		return this.connecting === false && this.socket != null;
	},

	checkConnection: function () {
		if (this.isConnected()) {
			// ping to see if it still is connected.
			var pingCmd = { command: this.commands.ping };
			this.socket.write(JSON.stringify(pingCmd) + "\n");

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
		this.listeners[id] = { callback: callback };
	},

	isListening: function (id) {
		return this.listeners[id] !== undefined;
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
	},

	// generic server command function
	command: function (command, args) {
		if (this.socket != null) {
			var serverCommand = this.commands[command]; // can be string or function
			if (_.isFunction(serverCommand)) { // if function, evaluate to string
				serverCommand = serverCommand.apply(this, args);
			} else {
				// strings are turned into json objects
				serverCommand = { command: serverCommand };
			}

			// output across socket
			logger.info(this.name + ": sending", { serverCommand: serverCommand });
			this.socket.write(JSON.stringify(serverCommand) + "\n");
		}
	},
});

var ClickerServer = function (options) {
	this.initialize(options);
	// setup regular checking of connection
	setInterval(_.bind(this.checkConnection, this), this.pingInterval);
};

ClickerServer.prototype = new ParticipantServer();
_.extend(ClickerServer.prototype, {
	name: "ClickerServer",
//  dataFilters: [ aliasFilter ],
	commands: {
		enableChoices: "enable choices",
		disableChoices: "disable choices",
		ping: "ping",
		status: "status",
		submitChoice: function (data) { return { command: "choose", arguments: [data] }; }
	},

	// takes in data from the server and outputs an object of form:
	//   { error: bool, command: str, data: * } or undefined if no valid data
	parseData: function (data, callback) {
		if (data === null) {
			return callback();
		}

		try {
			// We may end up with multiple entries quickly passed across the socket
			// e.g., data = {...}
			//              {...}
			var combinedRegExp = /\}\n\{/g;
			if (combinedRegExp.test(data)) {
				// convert it into an array
				// handle each data response separately
				var combinedData = "[" + data.replace(combinedRegExp, "},{") + "]";
				var jsonDataArray = JSON.parse(combinedData);

				// group by type to allow merging for efficiency
				var dataGroupedByType = _.groupBy(jsonDataArray, function (d) { return d.type; });

				// if we have multiple choices, merge them together
				if (dataGroupedByType.choices) {
					var mergedData = _.flatten(_.pluck(dataGroupedByType.choices, "data"));
					dataGroupedByType.choices = [{ type: "choices", data: mergedData }];
				}

				// handle each group data individually
				_.each(_.values(dataGroupedByType), function (groupData) {
					_.each(groupData, function (jsonData) {
						this.handleJsonData(jsonData, callback);
					}, this);
				}, this);
			} else {
				var jsonData = JSON.parse(data);
				this.handleJsonData(jsonData, callback);
			}
		} catch (e) {
			logger.warn("invalid JSON received: ", { error: e, data: data });
			return;
		}


	},

	handleJsonData: function (jsonData, callback) {
		if (jsonData.type === "choices") {
			return this.filterData({ data: jsonData.data }, callback);

		} else if (jsonData.type === "command") {
			var cmdData = jsonData.data;

			return callback({ command: this.commandKey(jsonData.command), data: jsonData.data });

		} else if (jsonData.type === "error") {
			return callback({ error: true, message: jsonData.error, command: jsonData.command, data: false });
		}

		// must have been garbage, return undefined
		return callback();
	}
});


module.exports = {
	ParticipantServer: ParticipantServer,
	ClickerServer: ClickerServer,
};