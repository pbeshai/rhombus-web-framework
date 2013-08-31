/**

	A simple grid app for displaying choices

*/
define([
	// Application.
	"app",

	"modules/Participant",

	"apps/StateApp"
],

function(app, Participant, StateApp) {

	var Grid = app.module();

	Grid.Views.Participant = Backbone.View.extend({
		template: "grid/participant",
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

	Grid.Views.Participants = app.registerView("grid", app.BaseView.extend({
		tagName: "div",
		className: "participant-grid",

		beforeRender: function () {
			this.participants.each(function (participant) {
				this.insertView(new Grid.Views.Participant({ model: participant }));
			}, this);
		},


		initialize: function () {
			app.BaseView.prototype.initialize.apply(this, arguments);
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