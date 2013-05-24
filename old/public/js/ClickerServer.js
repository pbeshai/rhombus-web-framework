/** Module for interfacing with the clicker server over websocket
 		Requires: jQuery, socket.io
 */
var ClickerServer = (function () {
	"use strict"

  var socket
  , socketEvents = { // events we send across the websocket
		  connect: "connect-participant-server",
		  disconnect: "disconnect-participant-server",
		  clickData: "choice-data",
		  enableClicks: "enable-choices",
		  disableClicks: "disable-choices",
		  status: "status",
			webClick: "submit-choice"
		}
	, config = {
			websocketUrl: "http://localhost",
			clickRegExp: /(\w+):([A-E])/g  // regular expression for click data. Matches ID:Click (e.g., 17fa321:A)
		}
	, events = { // client-side events that we allow handlers for
			data: "data",
			connect: "connect",
			disconnect: "disconnect",
			enableClicks: "enable-clicks",
			disableClicks: "disable-clicks",
			status: "status"
			// custom web socket events
		}
	, eventHandler = null;

	var init = function (settings) {
			config = $.extend({}, config, settings); // override defaults

			// init internal event handler
			this.eventHandler = Object.create(EventHandler);
			this.eventHandler.init(this);

			// allow specification of a data handler function through option dataHandler
			if (config.dataHandler !== undefined) {
				on("data", config.dataHandler);
			}

		  socket = io.connect(config.websocketUrl);
		  socket.on(socketEvents.clickData, $.proxy(dataCallback, this));
		  socket.on(socketEvents.status, $.proxy(statusCallback, this));
		  socket.on(socketEvents.connect, $.proxy(connectCallback, this));
		  socket.on(socketEvents.disconnect, $.proxy(disconnectCallback, this));
		  socket.on(socketEvents.enableClicks, $.proxy(enableClicksCallback, this));
		  socket.on(socketEvents.disableClicks, $.proxy(disableClicksCallback, this));
		}

	, connect = function () {
			socket.emit(socketEvents.connect);
		}

	, connectCallback = function (data) {
			console.log("connect callback", data);
			console.log(this);
			this.eventHandler.trigger(events.connect, arguments);
		}

	, disconnect = function () {
			socket.emit(socketEvents.disconnect);
		}

	, disconnectCallback = function (data) {
			console.log("disconnect callback", data);
			this.eventHandler.trigger(events.disconnect, arguments);
		}

	, enableClicks = function () {
			socket.emit(socketEvents.enableClicks);
		}

	, enableClicksCallback = function (data) {
			console.log("enable clicks callback", data);
			this.eventHandler.trigger(events.enableClicks, arguments);
		}

	, disableClicks = function () {
			socket.emit(socketEvents.disableClicks);
		}

	, disableClicksCallback = function (data) {
			console.log("disable clicks callback", data);
			this.eventHandler.trigger(events.disableClicks, arguments);
		}

	, status = function () {
			socket.emit(socketEvents.status);
		}

	, statusCallback = function (data) {
			console.log("status callback", data);
			this.eventHandler.trigger(events.status, arguments);
		}

	, webClick = function (data) {
		socket.emit(socketEvents.webClick, data);
	}

	// returns an array [{ id: x, click: x }, ...]
	, parseData = function (data) {
			var result, id, click;
			var clickData = [];
			while(result = config.clickRegExp.exec(data.clicks)) {
				id = result[1];
				click = result[2];

				clickData.push({id: id, click: click});
			}

			return clickData;
		}

	, dataCallback = function (data) {
			var clickData = parseData(data);
			this.eventHandler.trigger(events.data, [clickData]);
		}

	, on = function (event, handler) {
			this.eventHandler.on(event, $.proxy(handler, this));
		};

	return {
		init: init,
		connect: connect,
		disconnect: disconnect,
		parseData: parseData,
		on: on,
		enableClicks: enableClicks,
		disableClicks: disableClicks,
		status: status,
		webClick: webClick
	};
}());