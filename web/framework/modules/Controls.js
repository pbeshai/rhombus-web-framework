/**

	Control panel.

*/
define([
	// Application.
	"App",

	"framework/modules/common/Common",
	"framework/modules/Clicker",
	"framework/apps/Apps",

	"framework/util/jquery/jQuery.psToggleButton"
],

function (App, Common, Clicker, Apps) {

	var Controls = App.module();

	var enableChoicesButton = function ($button, participantServer) {
		$button.psToggleButton({
			clickState1: participantServer.enableChoices,
			clickState2: participantServer.disableChoices,
			textState1: "Enable Choices",
			textState2: "Disable Choices",
			state1To2Event: "enable-choices",
			state2To1Event: "disable-choices",
			classState1: "btn-success",
			classState2: "btn-danger",
			participantServer: participantServer
		});

		if (!participantServer.get("connected")) {
			$button.addClass("disabled").prop("disabled", true);
		}

		participantServer.on("status", function (state) {
			if (state.acceptingChoices) {
				$button.trigger("to-state2");
			} else {
				$button.trigger("to-state1");
			}
		});

		participantServer.on("connect", function (success) {
			console.log("connect? ", success, $button);
			if (success) {
				$button.removeClass("disabled").prop("disabled", false);
			} else {
				$button.addClass("disabled").prop("disabled", true);
			}
		});
		participantServer.on("disconnect", function (success) {
			if (success) {
				$button.addClass("disabled").prop("disabled", true);
			}
		});

		// check the current state, so we initialize correctly
		if (participantServer.get("acceptingChoices")) {
			$button.trigger("to-state2");
		}
	};

	Controls.Views.Viewers = App.BaseView.extend({
		template: "framework/templates/controls/viewers",
		events: {
			"click .reload-view" : "reloadView"
		},

		serialize: function () {
			return { viewers: App.controller.get("viewers") };
		},

		initialize: function () {
			this.listenTo(App.controller, "change:viewers", this.render);
		},

		reloadView: function (evt) {
			App.controller.reloadView(); // TODO: should probably include viewer

			var $el = $(evt.currentTarget);
			$el.removeClass("rotate360");
			this.restartCssAnimationFix($el[0]);
			$el.addClass("rotate360");
		}
	});

	Controls.Views.Controls = App.BaseView.extend({
		className: "controls",
		template: "framework/templates/controls/controls",

		events: {
			"click .clear-database": "clearDatabase",
		},

		initialize: function () {
			App.controller.participantServer.hookCollection(this.options.participants, this);
			this.listenTo(this.options.participants, "change", App.controller.changedParticipant);
			this.listenTo(this.options.participants, "update:choice", App.controller.changedParticipant);
			this.listenTo(this.options.participants, "sync", App.controller.syncParticipants);
			this.listenTo(this.options.participants, "add", App.controller.newParticipant);

			// TODO: temporary keyboard shortcuts for faster debugging
			var testApp = "seq-alias";
			$(document.body).on("keypress", function (evt) {
				if (evt.ctrlKey) {
					switch (evt.which) {
						case 49: // ctrl-1
							$(".prev-state").click();
							break;
						case 50: // ctrl-2
							$(".next-state").click();
							break;
						case 51: // ctrl-3
							$(".random-votes").click();
							break;
						case 52: // ctrl-4
							$(".random-votes-ab").click();
							break;
						case 53: // ctrl-5
							$(".random-votes-cd").click();
							break;
						case 54: // ctrl-6
							$(".add-clickers").click();
							break;
						case 48: // ctrl-0
							$('button[data-key="' + testApp + '"]').click(); // select app
							break;
					}
				}
			});
		},

		beforeRender: function () {
			var appSelector = new Apps.Views.Selector();
			this.setView(".app-selector", appSelector);
			var controls = this;

			// when an application has been selected
			appSelector.on("app-selected", _.bind(this.appSelected, this));

			this.insertView(".clicker-panel", new Clicker.Views.Clickers({ collection: this.options.participants}));

			this.setView(".viewers", new Controls.Views.Viewers());
		},

		appSelected: function (selectedApp) {
			var $appControls = this.$(".app-controls");

			// save old height to prevent flicker
			var oldHeight = $appControls.height();
			$appControls.css("min-height", oldHeight).css({opacity: 0});


			// reset the participants if there was another app running previously
			// this.options.participants.fetch({ reset: true }); TODO
			this.options.participants.reset();

			// clean up the old app
			var activeApp = App.controller.get("activeApp");
			if (activeApp) {
				activeApp.cleanup();
			}

			// instantiate the application.
			App.controller.set("activeApp", selectedApp.instantiate({ participants: this.options.participants }));

			// load the app controls
			var AppControlsView = selectedApp.AppControlsView || Common.Views.AppControls;
			var appControls = new AppControlsView({
				title: selectedApp.title,
				activeApp: App.controller.get("activeApp")
			});

			this.setView(".app-controls", appControls);
			appControls.on("afterRender", function () {
				$appControls.css("min-height", "").animate({opacity: 1});
			});
			appControls.render();
		},

		afterRender: function () {
			enableChoicesButton(this.$(".enable-choices-button"), App.controller.participantServer);
		},

		clearDatabase: function () {
			var verify = confirm("Are you sure you want to clear the participant database?");

			if (verify) {
				console.log("clearing database");
				App.api({
					call: "participants",
					type: "DELETE",
					success: function () {
						console.log("successful deletion of participants");
					},
					error: function () {
						console.log("error deleting participants");
					}
				});
			}
		}
	});

	return Controls;
});