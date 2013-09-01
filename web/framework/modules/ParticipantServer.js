/** Module for interfacing with the participant server over websocket
 */
define([
	"App",

	"framework/util/SocketUtils"
	],
	function (App, SocketUtils) {
	"use strict";

	var ParticipantServer = App.module();

	ParticipantServer.Model = Backbone.Model.extend({
		defaults: {
			connected: false,
			ignoreChoices: false,
			acceptingChoices: false // whether submitting choices is enabled
		},

		// events we trigger to clients
		clientEvents: {
			choiceData: "data",
			connect: "connect",
			disconnect: "disconnect",
			enableChoices: "enable-choices",
			disableChoices: "disable-choices",
			status: "status",
			instructor: "instructor"
		},

		// events we send across the websocket
		socketEvents:  {
			connect: "connect-participant-server",
			disconnect: "disconnect-participant-server",
			choiceData: "choice-data",
			enableChoices: "enable-choices",
			disableChoices: "disable-choices",
			status: "status",
			submitChoice: "submit-choice"
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

		// collection must have updateFromServer function
		// doing it this way allows the event handler to be cleaned up
		// when the context (typically a view) is cleaned up.
		// (as opposed to having the collection itself listen for data);
		hookCollection: function (collection, context) {
			context.listenTo(this, "data", function (data) {
				collection.updateFromServer(data);
			});
		},

		// separate the instructor
		choiceDataCallback: function (data) {
			var groupedData = _.groupBy(data.choices, function (elem) { return elem.instructor === true ? "instructor" : "choices"; });

			if (groupedData.instructor) {
				this.trigger(this.clientEvents.instructor, groupedData.instructor);
			}
			if (groupedData.choices && !this.get("ignoreChoices") && !this._ignoring) {
				this.trigger(this.clientEvents.choiceData, { choices: groupedData.choices });
			}

			// we handle the trigger here, so abort
			return false;
		},

		ignoreChoices: function () { // can be used to discard choice as they come in without triggering them
			this.set("ignoreChoices", true);
		},

		stopIgnoringChoices: function () {
			this.set("ignoreChoices", false);
		},

		connectCallback: function (data) {
			this.set("connected", data);
		},

		enableChoicesCallback: function (data) {
			this.set("acceptingChoices", data);
		},

		disableChoices: function () {
			// set internal flag to immediately start rejecting choices until they are stopped at the server
			this._ignoring = true;
			this.socket.emit(this.socketEvents.disableChoices);
		},

		disableChoicesCallback: function (data) {
			this.set("acceptingChoices", !data);
			this._ignoring = false; // unset internal ignoring flag
		},

		statusCallback: function (data) {
			this.set("acceptingChoices", data.acceptingChoices);
		},

		submitChoice: function (id, choice) {
			this.socket.emit(this.socketEvents.submitChoice, { id: id, choice: choice });
		}
	});

	ParticipantServer.Views.Status = App.BaseView.extend({
		template: "framework/templates/participantServer/status",

		serialize: function () {
			return {
				model: this.model,
				classes: {
					isConnected: this.model.get("connected") ? "is-connected" : "not-connected",
					isAcceptingChoices: this.model.get("acceptingChoices") ? "is-accepting-choices" : "not-accepting-choices",
					connected: this.model.get("connected") ? "status-on" : "status-off",
					acceptingChoices: this.model.get("acceptingChoices") ? "status-on" : "status-off"
				},
				labels: {
					connected: this.model.get("connected") ? "Connected" : "Disconnected",
					acceptingChoices: this.model.get("acceptingChoices") ? "Accepting Choices" : "Not Accepting Choices"
				}
			};
		},

		initialize: function () {
			this.listenTo(this.model, "change", this.render);
		}
	});

	return ParticipantServer;
});