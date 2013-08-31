/**
A module that lets you select what mode of browser window this is - a controller or a viewer.
*/
define([
	// Application.
	"app",

	"modules/ParticipantServer",
	"modules/AppController",

	"modules/common/Common",
	"modules/Participant"
],

function(app, ParticipantServer, AppController, Common, Participant) {

	var Modes = app.module();

	var ParticipantUpdater = function () {
		this.participantBuffer = {};
		this.ignore = false; // a flag to determine if new additions should be added or discarded.
		this.running = true; // a flag to determine if we should send update view calls when the buffer is not empty
		setInterval(_.bind(this.update, this), this.updateInterval);
	};
	_.extend(ParticipantUpdater.prototype, {
		updateInterval: 150,

		pause: function () {
			this.running = false;
		},

		resume: function () {
			this.running = true;
		},

		add: function (participant) {
			if (this.ignore === "once") {
				this.ignore = false;
				return;
			}

			if (!this.ignore) {
				if (participant instanceof Backbone.Collection) {
					participant.each(this.addParticipant, this);
				} else {
					this.addParticipant(participant);
				}

			}
		},

		addParticipant: function (participant) {
			if (!this.ignore) {
				this.participantBuffer[participant.get("alias")] = participant;
			}
		},

		clearBuffer: function () {
			this.participantBuffer = {};
		},

		update: function () {
			var participants = _.values(this.participantBuffer);
			if (this.running && participants.length) {
				// TODO: fix Viewer1 and probably the way we get appController
				app.controller.appController.updateView({ participants: participants }, "Viewer1");
				this.clearBuffer();
			}
		},

		ignoreChanges: function () {
			this.ignore = true;
		},

		ignoreChangesOnce: function () {
			this.ignore = "once";
		},

		stopIgnoringChanges: function () {
			this.ignore = false;
		}
	});

	Modes.Controller = Backbone.Model.extend({
		initialize: function (attrs) {
			_.bindAll(this, "handleInstructor", "changedParticipant", "syncParticipants", "newParticipant");
			this.participantServer = new ParticipantServer.Model({ socket: attrs.socket });
			this.appController = new AppController.Model({ socket: attrs.socket });
			this.participantUpdater = new ParticipantUpdater();

			this.handleInstructor();
			this.handleViewers();
		},

		handleViewers: function () {
			this.set("viewers", []);
			var controller = this;
			this.appController.on("viewer-list", function (data) {
				controller.set("viewers", data.viewers);
			});

			this.appController.on("viewer-connect", function (viewer) {
				var viewers = controller.get("viewers") || [];
				viewers.push(viewer);
				controller.set("viewers", viewers);
				controller.trigger("change:viewers");
				controller.reloadView();
			});

			this.appController.on("viewer-disconnect", function (viewer) {
				var reducedViewers = _.reject(controller.get("viewers"), function (v) { return v.id === viewer.id; });
				controller.set("viewers", reducedViewers);
			});
		},

		// setup instructor handling
		handleInstructor: function () {
			this.listenTo(this.participantServer, "instructor", function (data) {
				// for now, only use the first item in the data array (highly unusual to have more than one)
				var choice = data[0].choice;
				switch (choice) {
					case "A":
						console.log("instructor A: toggle polling");
						if (this.participantServer.get("acceptingChoices")) {
							this.participantServer.disableChoices();
						} else {
							this.participantServer.enableChoices();
						}
						break;
					case "B":
						console.log("instructor B (unused)");
						break;
					case "C":
						console.log("instructor C: next state");
						this.appNext();
						break;
					case "D":
						console.log("instructor D: prev state");
						this.appPrev();
						break;
					case "E":
						console.log("instructor E (unused)");
						break;
				}
			});
		},

		// add a changed participant to the buffer to be updated on the views
		changedParticipant: function (participant) {
			this.participantUpdater.add(participant);
		},

		// when the participants collection is synced (e.g., fetch is called), signal the updater
		syncParticipants: function (collection, participants) {
			this.participantUpdater.add(collection);
		},

		newParticipant: function (participant) {
			this.participantUpdater.add(participant);
		},

		// go to next state in app
		appNext: function () {
			var activeApp = this.get("activeApp");
			if (activeApp) {
				activeApp.next();
			}
		},

		// go to prev state in app
		appPrev: function () {
			var activeApp = this.get("activeApp");
			if (activeApp) {
				activeApp.prev();
			}
		},

		// udpate app config
		appConfig: function(config) {
			var activeApp = this.get("activeApp");
			if (activeApp) {
				console.log("App Config", config, activeApp);
				activeApp.configure(config);
			}
		},

		reloadView: function (viewer) { // TODO: should use viewer
			var currState = this.get("activeApp").get("currentState");
			if (currState.rerender) {
				currState.rerender();
			}
		}
	});

	Modes.Viewer = Backbone.Model.extend({
		initialize: function (attrs) {
			this.appController = new AppController.Model({ socket: attrs.socket });
			this.listenTo(this.appController, "load-view", this.loadView);

			this.listenTo(this.appController, "update-view", this.updateView);
		},

		loadView: function (data) {
			console.log("viewer got load view", data);

			// handle participants/collection as a special case since it is so common.
			// (reconstruct the array into a Participant.Collection object)
			if (data.options.participants) {
				data.options.participants = Participant.Util.collectionFromJSON(data.options.participants);
			}
			// if it's a GroupModel, recreate it
			if (data.options.model && data.options.model.group1) {
				data.options.model = Common.Models.GroupModel.fromJSON(data.options.model);
			}
			// TODO: interpret the load view command to load the appropriate view
			app.setMainView(new app.views[data.view](data.options));
		},

		updateView: function (data) {
			console.log("update view data", data);

			var mainView = app.getMainView();

			// TODO: this special case and in load view should probably be in diff functions so views can override

			if (data.participants) {
				// handle participants as a special case
				if (mainView.participants) {
					mainView.participants.update(data.participants);

				// handle group model as a special case
				} else if (mainView.model && mainView.model.get("participants")) {
					mainView.model.get("participants").update(data.participants);
				}
			}

			if (mainView.update) {
				mainView.update(data);
			}
		}
	});

	Modes.Views.Selector = Backbone.View.extend({
		template: "modes/selector",
		className: "mode-selector",

		events: {
			"click #btn-controller" : "selectController",
			"click #btn-viewer" : "selectViewer",
			"change #manager-id-input" : "updateManagerId"
		},

		selectController: function () {
			var managerId = this.model.get("managerId") || "m1";
			app.router.navigate("/" + managerId + "/controller", { trigger: true });
		},

		selectViewer: function () {
			var managerId = this.model.get("managerId") || "m1";
			var viewerName = this.model.get("viewerName") || "main";
			app.router.navigate("/" + managerId + "/viewer/" + viewerName, { trigger: true });
		},

		updateManagerId: function () {
			this.model.set("managerId", this.$("#manager-id-input").val());
		},

		serialize: function () {
			return { model: this.model };
		}
	});

	Modes.Views.Viewer = Backbone.View.extend({
		template: "viewer/viewer",
		className: "viewer",

		serialize: function () {
			return {
				name: app.viewer.get("name")
			};
		},
	});

	return Modes;
});