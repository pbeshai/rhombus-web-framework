/**

	A simple grid app for displaying choices

*/
define([
	// Application.
	"App",

	"framework/modules/Participant",

	"framework/apps/StateApp"
],

function (App, Participant, StateApp) {

	var Grid = App.module();

	Grid.Views.Participant = App.BaseView.extend({
		template: "framework/templates/grid/participant",
		tagName: "div",
		className: "participant",

		choiceClass: {
			A: "choice-a",
			B: "choice-b",
			C: "choice-c",
			D: "choice-d",
			E: "choice-e"
		},

		serialize: function () {
			return { model: this.model };
		},

		beforeRender: function () {
			console.log("rendering participant", this.cid);
			var choice = this.model.get("choice");
			// remove old choice classes and set new one
			this.$el
				.removeClass(_.values(this.choiceClass).join(" "))
				.addClass(this.choiceClass[choice]);
		},

		initialize: function () {
			this.listenTo(this.model, "change", this.render);
		}
	});

	Grid.Views.Participants = App.registerView("grid", App.BaseView.extend({
		tagName: "div",
		className: "participant-grid",

		beforeRender: function () {
			this.participants.each(function (participant) {
				this.insertView(new Grid.Views.Participant({ model: participant }));
			}, this);
		},


		initialize: function () {
			App.BaseView.prototype.initialize.apply(this, arguments);
		}
	}));

	// To be used in StateApps
	Grid.State = StateApp.ViewState.extend({
		// view: Grid.Views.Participants,
		view: "grid",

		viewOptions: function () {
			return { participants: this.input.participants || this.options.participants };
		},
	});

	return Grid;
});