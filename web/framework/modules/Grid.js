/**

	A simple grid app for displaying choices

*/
define([
	// Application.
	"framework/App",

	"framework/modules/common/Common",
	"framework/modules/Participant",

	"framework/apps/StateApp"
],

function (App, Common, Participant, StateApp) {

	var Grid = App.module();

	Grid.Views.Participant = Common.Views.ParticipantDisplay.extend({
		actionAnimations: {
			"A": "pulse",
			"B": "bounce",
			"C": "shake",
			"D": "swing",
			"E": "wobble"
		},

		cssClass: function (model) {
			var css = "big-message animated ";
			if (model.get("choice")) {
				return css + this.actionAnimations[model.get("choice")];
			}
			return css;
		},

		overlay: function (model) {
			if (model.get("choice")) {
				return "choice-" + model.get("choice").toLowerCase();
			}
		},

		sinitListen: function () {
			this.listenTo(this.model, "update", this.safeRender);
		}
	});

	Grid.Views.Participants = App.registerView("grid", Common.Views.SimpleLayout.extend({
		ParticipantView: Grid.Views.Participant
	}));

	// To be used in StateApps
	Grid.State = StateApp.ViewState.extend({
		name: "grid",
		view: "grid",
		defaults: {
			fetchParticipants: true
		},

		viewOptions: function () {
			return { participants: this.input.participants || this.options.participants };
		},

		beforeRender: function () {
			this.listenTo(this.input.participants, "new-queued", function (model, collection) {
				collection.addNewParticipants();
			});
		},

		onEntry: function (input) {
			var participants = input.participants;

			if (this.options.fetchParticipants) {
				var deferRun = this.deferRun;
				participants.fetch({ success: function () {
					deferRun.resolve();
					App.controller.participantUpdater.ignoreChangesOnce(); // do not send sync callback over the wire (since it is included in loadView)
				}});
			} else {
				this.deferRun.resolve();
			}
		}
	});

	return Grid;
});