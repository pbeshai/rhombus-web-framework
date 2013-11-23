define([
	"framework/App",
	"framework/modules/common/Common",

	"framework/modules/StateApp/Module"
],

function (App, Common, StateApp) {

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
			var css = "br-corner-message animated ";
			if (model.get("choice")) {
				return css + this.actionAnimations[model.get("choice")];
			}
			return css;
		},

		overlay: function (model) {
			if (model.get("choice")) {
				return "choice-" + model.get("choice").toLowerCase();
			}
		}
	});

	Grid.Views.Header = App.BaseView.extend({
		template: _.template("<h1><%= header %></h1>"),

		serialize: function () {
			return { header: "Participants " };
		},

		beforeRender: function () {
			this.insertView("h1", new Common.Views.Count({ tagName: "span", className: "subtle", participants: this.participants }));
		},
	});

	Grid.Views.Participants = App.registerView("grid", Common.Views.SimpleLayout.extend({
		HeaderView: Grid.Views.Header,
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

		addNewParticipants: function () {
			this.input.participants.addNewParticipants();
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