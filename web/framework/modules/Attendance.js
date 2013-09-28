/**

A simple module for showing active participants and allowing registration of new ones.

*/
define([
	// Application.
	"framework/App",

	"framework/modules/common/Common",
	"framework/modules/Participant",

	"framework/modules/StateApp/Module"
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

	Attendance.Views.Participant = Common.Views.ParticipantDisplay.extend({
		className: "participant big-message",

		mainText: function (model) {
			if (this.model.get("choice") != null) {
				return "&#x2713;";
			}
		},

		cssClass: function (model) {
			if (this.model.get("choice") != null) {
				return "participant-here";
			}
		},

		overlay: function (model) {
			if (this.model.get("choice") != null) {
				return "green";
			}
		}
	});

	Attendance.Views.Header = App.BaseView.extend({
		template: _.template("<h1><%= header %></h1>"),

		serialize: function () {
			return { header: "Check-in " };
		},

		beforeRender: function () {
			this.insertView("h1", new Common.Views.Count({ tagName: "span", className: "subtle", participants: this.participants }));
		},
	});

	Attendance.Views.Participants = App.registerView("attendance", Common.Views.SimpleLayout.extend({
		header: "Check-in",
		HeaderView: Attendance.Views.Header,
		ParticipantView: Attendance.Views.Participant,
		InstructionsModel: Attendance.Instructions
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