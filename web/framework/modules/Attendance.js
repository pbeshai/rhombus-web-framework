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

			this.listenTo(this.participants, {
				"reset": this.render,
				"add": this.add
			});
		}
	}));

	// To be used in StateApps
	Attendance.State = StateApp.ViewState.extend({
		name: "attendance",
		view: "attendance", // key in App.views map

		viewOptions: function () {
			return {
				participants: this.options.participants
			};
		},

		// reset participants to those in the db everytime we enter the attendance state
		onEntry: function (input, prevState) {
			var deferRun = this.deferRun;
			this.options.participants.fetch({ success: function () {
				deferRun.resolve();
				App.controller.participantUpdater.ignoreChangesOnce(); // do not send sync callback over the wire (since it is included in loadView)
			}});
		},

		beforeRender: function () {
			this.listenTo(this.options.participants, "new-queued", function (model, collection) {
				collection.addNewParticipants();
			});
		},

		onExit: function () {
			var presentParticipants = this.options.participants;
			var notHere = presentParticipants.filter(function (participant) {
				return participant.get("choice") == null;
			});
			presentParticipants.remove(notHere);

			return new StateApp.StateMessage({ participants: presentParticipants });
		}
	});

	return Attendance;
});