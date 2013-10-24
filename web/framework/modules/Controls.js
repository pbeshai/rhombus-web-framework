/**

	Control panel.

*/
define([
	// Application.
	"framework/App",

	"framework/modules/common/Common",
	"framework/modules/Clicker",
	"framework/modules/Apps",

	"framework/util/jquery/jQuery.psToggleButton"
],

function (App, Common, Clicker, Apps) {

	var Controls = App.module();

	var enableChoicesButton = function ($button, participantServer) {
		$button.psToggleButton({
			clickState1: participantServer.enableChoices,
			clickState2: participantServer.disableChoices,
			textState1: "<i class='circle-status status-off'></i> Not Accepting Choices",
			textState2: "<i class='circle-status status-on'></i> Accepting Choices",
			state1To2Event: "enable-choices",
			state2To1Event: "disable-choices",
			titleState1: "Click to start accepting choices",
			titleState2: "Click to stop accepting choices",
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
			"click .reload-view" : "reloadView",
			"click .open-new-viewer" : "newViewer",
		},

		serialize: function () {
			return { viewers: App.controller.get("viewers") };
		},

		initialize: function () {
			this.listenTo(App.controller, "change:viewers", this.render);
		},

		newViewer: function () {
			// from http://stackoverflow.com/questions/57652/how-do-i-get-javascript-to-open-a-popup-window-on-the-current-monitor
			function popup_params(width, height) {
				var x = typeof window.screenX != 'undefined' ? window.screenX : window.screenLeft;
				var y = typeof window.screenY != 'undefined' ? window.screenY : window.screenTop;
				var w = typeof window.outerWidth!='undefined' ? window.outerWidth : document.documentElement.clientWidth;
				var h = typeof window.outerHeight != 'undefined' ? window.outerHeight: (document.documentElement.clientHeight - 22);
				var X = (x < 0) ? window.screen.width + x : x;

				var left = parseInt(X + ((w - width) / 2), 10);
				var top = parseInt(y + ((h - height) / 2.5), 10);
				var output = 'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',scrollbars=1';
				return output;
			}
			var newWindow = window.open("/m1/viewer/main", "_blank", "status=0,location=0,toolbar=0," + popup_params(1024, 768));
		},

		reloadView: function (evt) {
			App.controller.reloadView(); // TODO: should probably include viewer

			var $el = $(evt.currentTarget);
			$el.removeClass("rotate360");
			this.restartCssAnimationFix($el[0]);
			$el.addClass("rotate360");
		}
	});

	Controls.Views.Participants = App.BaseView.extend({
		template: "framework/templates/controls/participants",
		events: {
			"click .add-new-participants" : "addNewParticipants"
		},

		serialize: function () {
			return {
				participants: this.participants
			};
		},

		addNewParticipants: function () {
			var activeApp = this.options.activeApp;
			// allow the active app to handle adding new participants
			if (activeApp && activeApp.addNewParticipants) {
				activeApp.addNewParticipants();
			} else {
				this.participants.addNewParticipants();
			}
		},

		initialize: function () {
			App.BaseView.prototype.initialize.apply(this, arguments);
			this.listenTo(this.participants, "add remove reset new-queued new-added", this.render);
		}
	});

	Controls.Views.Controls = App.BaseView.extend({
		className: "controls",
		template: "framework/templates/controls/controls",

		events: {
			"click .clear-database": "clearDatabase",
			"click .add-countdown-button": "addCountdown",
			"click .clear-countdown-button": "clearCountdown"
		},

		initialize: function () {
			App.controller.participantServer.hookCollection(this.options.participants, this);
			this.listenTo(this.options.participants, "change", App.controller.changedParticipant);
			this.listenTo(this.options.participants, "update:choice", App.controller.changedParticipant);
			this.listenTo(this.options.participants, "sync", App.controller.syncParticipants);
			this.listenTo(this.options.participants, "add", App.controller.newParticipant);
			// reset viewers
			App.controller.appController.clearView();
		},

		beforeRender: function () {
			var appSelector = new Apps.Views.Selector();
			this.setView(".app-selector", appSelector);
			var controls = this;

			// when an application has been selected
			appSelector.on("app-selected", _.bind(this.appSelected, this));

			this.setView(".viewers", new Controls.Views.Viewers());
		},

		appSelected: function (selectedApp) {
			var $appControls = this.$(".app-controls");

			// save old height to prevent flicker
			var oldHeight = $appControls.height();
			$appControls.css("min-height", oldHeight).css({opacity: 0});

			// reset the participants if there was another app running previously
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

			var participantControls = new Controls.Views.Participants({
				participants: this.options.participants,
				activeApp: App.controller.get("activeApp")
			});
			this.setView(".participant-controls", participantControls);
			participantControls.render();
		},

		afterRender: function () {
			enableChoicesButton(this.$(".enable-choices-button"), App.controller.participantServer);
			this.$(".instructor-controller").toggleButton({
				textState1: "<i class='circle-status status-on'></i> Instructor Controller Enabled",
				textState2: "<i class='circle-status status-off'></i> Instructor Controller Disabled",
				clickState1: this.toggleInstructorControl,
				clickState2: this.toggleInstructorControl,
				titleState1: "Click to interpret the instructor's controller as a normal participant",
				titleState2: "Click to interpret the instructor's controller as as a controller for the system"
			});
		},

		toggleInstructorControl: function () {
			var instructorControl = App.controller.participantServer.get("instructorControl");
			App.controller.participantServer.set("instructorControl", !instructorControl);
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
		},

		addCountdown: function () {
			App.controller.addCountdown();
		},

		clearCountdown: function () {
			App.controller.clearCountdown();
		}
	});


	Controls.Views.DebugControls = App.BaseView.extend({
		template: "framework/templates/controls/debug_controls",

		initialize: function () {
			// keyboard shortcuts for faster debugging
			var testApp = "npd";
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
			this.setView(".main-controls", new Controls.Views.Controls({ participants: this.options.participants }));
			this.setView(".clicker-panel", new Clicker.Views.Clickers({ collection: this.options.participants }));
		}
	});


	return Controls;
});