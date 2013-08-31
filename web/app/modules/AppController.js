/**
	Module for interfacing with the running app via websocket
 */
define([
	"app",

	"util/SocketUtils"
	],
	function (app, SocketUtils) {
	"use strict";

	var AppController = app.module();

	AppController.Model = Backbone.Model.extend({
		// events we trigger to clients
		clientEvents: {
			appMessage: "app-message",
			viewerList: "viewer-list",
			viewerConnect: "viewer-connect",
			viewerDisconnect: "viewer-disconnect",
		},

		// events we send across the websocket
		socketEvents:  {
			appMessage: "app-message",
			viewerList: "viewer-list",
			viewerConnect: "viewer-connect",
			viewerDisconnect: "viewer-disconnect",
		},

		reset: function () {
			this.clear();
		},

		sendAppMessage: function (type, message) {
			var appMessage = {
				type: type,
				message: message,
			};

			this.socket.emit("app-message", appMessage);
		},

		appMessageCallback: function (data) {
			console.log("app message received", data);
			if (data.type) {
				this.trigger(data.type, data.message);
			}
		},

		loadView: function (view, options, viewer) {
			console.log("load view", view, options);

			// make JSON friendly
			_.each(_.keys(options), function (key) {
				if (options[key] && options[key].toJSON) {
					options[key] = options[key].toJSON();
				}
			});

			this.sendAppMessage("load-view", { view: view, options: options }); // TODO add viewer , viewer: viewer });
		},

		updateView: function (data) {
			console.log("update view", data);
			// make JSON friendly
			_.each(_.keys(data), function (key) {
				if (data[key] && data[key].toJSON) {
					data[key] = data[key].toJSON();
				}
			});
			this.sendAppMessage("update-view", data); // TODO add viewer , viewer: viewer });
		},

		initialize: function (attrs) {
			// web socket
			this.socket = attrs.socket;
			SocketUtils.initSendReceive.call(this);

			this.on("change:socket", function (model, socket) {
				this.socket = socket;
				SocketUtils.bindSocketEvents.call(this);
			});
		},
	});

	return AppController;
});