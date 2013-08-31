/** Module for interfacing with the participant server over websocket
 */
define(["app"],
	function (app) {
	"use strict";

	var debug = false;

	var SocketUtils = {

		/**
		 *  Sets up the convention of objects having this.socketEvents and this.clientEvents.
		 *  for each key k in this.socketEvents, a function will be added to this named this.k,
		 *  and a corresponding callback function will also be added named this.kCallback.
		 *  this.k takes a data parameter and emits across the socket using the event this.socketEvents[k].
		 *  this.kCallback takes a data parameter and triggers the client event this.clientEvents[k].
		 *  If this.kCallback already exists prior to initSendReceive, that code will be run before
		 *  triggering the client event.
		 */

		// to be called SocketUtils.initSendReceive.call(this);
		initSendReceive: function () {
			if (!this.socket) return;

			_.each(_.keys(this.socketEvents), function (eventKey) {
				var func = eventKey;
				var callbackFunc = eventKey + "Callback";

				// e.g. add this.status() function if it doesn't exist, otherwise bind "this"
				if (this[func] === undefined) {
					this[func] = SocketUtils.sendFunction.apply(this, [this.socketEvents[eventKey]]);
				} else {
					this[func] = _.bind(this[func], this);
				}
				// e.g. add this.statusCallback(data) function
				this[callbackFunc] = SocketUtils.receiveFunction.apply(this, [this.clientEvents[eventKey], this[callbackFunc]]);
			}, this);

			SocketUtils.bindSocketEvents.call(this);
		},

		bindSocketEvents: function () {
			if (!this.socket) return;

			_.each(_.keys(this.socketEvents), function (eventKey) {
				var callbackFunc = eventKey + "Callback";
				// bind the socket event to the callback
				this.socket.on(this.socketEvents[eventKey], this[callbackFunc]);
			}, this);
		},

		// creates a typical socket send function
		sendFunction: function (socketEvent) {
			return _.bind(function (data) {
				if (debug) { console.log("sending " + socketEvent + ": ", data); }
				this.socket.emit(socketEvent, data);
			}, this);
		},

		// creates a typical socket receive function
		receiveFunction: function (clientEvent, callback) {
			return _.bind(function (data) {
				if (debug) { console.log("receiving " + clientEvent + ": ", data); }

				// run the existing callback function
				if (callback !== undefined) {
					var trigger = callback.apply(this, [data]);
					if (trigger === false) {
						return;
					}
				}

				this.trigger(clientEvent, data);
			}, this);
		},
	};

	return SocketUtils;
});