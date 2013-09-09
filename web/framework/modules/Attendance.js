/**

A simple module for showing active participants and allowing registration of new ones.

*/
define([
	// Application.
	"framework/App",

	"framework/modules/common/Common",
	"framework/modules/Participant",

	"framework/apps/StateApp"
],

function (App, Common, Participant, StateApp) {

	var Attendance = App.module();

	Attendance.Instructions = Common.Models.Instructions.extend({
		description: "Press any button to check-in.",
		buttonConfig: {
			"A": { description: "Check-in" },
			"B": { description: "Check-in" },
			"C": { description: "Check-in" },
			"D": { description: "Check-in" },
			"E": { description: "Check-in" }
		}
	});

	Attendance.Views.Participant = App.BaseView.extend({
		template: "framework/templates/attendance/participant",
		tagName: "div",
		className: "participant big-message",
		hereClass: "participant-here",

		serialize: function () {
			return { model: this.model };
		},

		beforeRender: function () {
			if (this.initialRender) {
				this.$el.hide();
			}

			var choice = this.model.get("choice");

			// remove old choice classes and set new one
			if (choice != null) {
				this.$el.addClass(this.hereClass);
			} else {
				this.$el.removeClass(this.hereClass);
			}
		},

		afterRender: function () {
			if (this.initialRender) {
				this.$el.fadeIn(200);
			}
			App.BaseView.prototype.afterRender.apply(this);
		},

		initialize: function () {
			App.BaseView.prototype.initialize.apply(this, arguments);
			this.listenTo(this.model, "change", this.render);
		}
	});

	Attendance.Views.Participants = App.registerView("attendance", App.BaseView.extend({
		template: "framework/templates/attendance/layout",
		options: {
			acceptNew: false,
		},

		serialize: function () {
			return { collection: this.participants };
		},

		beforeRender: function () {
			this.participants.each(function (participant) {
				this.insertView(".participant-grid", new Attendance.Views.Participant({ model: participant }));
			}, this);
			this.insertView(new Common.Views.Instructions({ model: new Attendance.Instructions() }));
		},

		add: function (participant) {
			var newView = new Attendance.Views.Participant({ model: participant });
			this.insertView(".participant-grid", newView);
			newView.render();
		},

		initialize: function (options) {
			App.BaseView.prototype.initialize.apply(this, arguments);

			if (this.options.acceptNew) {
				this.prevAcceptNew = this.participants.options.acceptNew;
				this.participants.options.acceptNew = true; // allow new users to be added when data comes from server
			}

			this.listenTo(this.participants, {
				"reset": this.render,
				"add": this.add
			});
		},

		cleanup: function () {
			if (this.options.acceptNew) {
				this.participants.options.acceptNew = this.prevAcceptNew;
			}
		},
	}));

	// To be used in StateApps
	Attendance.State = StateApp.ViewState.extend({
		name: "attendance",
		view: "attendance", // key in App.views map

		viewOptions: function () {
			return {
				participants: this.options.participants,
				acceptNew: this.options.acceptNew
			};
		},

		// reset participants to those in the db everytime we enter the attendance state
		onEntry: function (input, prevState) {
			var deferRun = this.deferRun;
			this.options.participants.fetch({ success: function () {
				deferRun.resolve();
				App.controller.participantUpdater.ignoreChangesOnce(); // do not send sync callback over the wire (since it is included in loadView)
			}});
			this.prevAcceptNew = this.options.participants.options.acceptNew;
			this.options.participants.options.acceptNew = this.options.acceptNew;
		},

		onExit: function () {
			var presentParticipants = this.options.participants;
			var notHere = presentParticipants.filter(function (participant) {
				return participant.get("choice") == null;
			});
			presentParticipants.remove(notHere);

			// register new guys (those without id attr)
			if (this.options.acceptNew && this.options.saveNew) {
				presentParticipants.saveNew();
			}
			return new StateApp.StateMessage({ participants: presentParticipants });
		},

		cleanup: function () {
			StateApp.ViewState.prototype.cleanup.call(this);
			this.options.participants.options.acceptNew = this.prevAcceptNew;
		}
	});

	return Attendance;
});