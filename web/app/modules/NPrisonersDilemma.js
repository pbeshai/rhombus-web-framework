/**

	A simple grid app for displaying choices

*/
define([
	// Application.
	"App",
	"framework/modules/common/Common",
	"modules/PrisonersDilemma",
	"framework/modules/Participant",

	"framework/apps/StateApp",
],
function (App, Common, PrisonersDilemma, Participant, StateApp) {

	var NPrisonersDilemma = App.module();
	NPrisonersDilemma.config = {
		// See Goehring and Kahan (1976) The Uniform N-Person Prisoner's Dilemma Game : Construction and Test of an Index of Cooperation
		Rratio: 0.10, // Rratio = R*(n-1). 0 < R < n-1, closer to 1 means more incentive for cooperation
		H: 10 // score increment when gaining 1 more cooperator
	};

	NPrisonersDilemma.Instructions = Common.Models.Instructions.extend({
		buttonConfig: {
			"C": { description: "Cooperate" },
			"D": { description: "Defect" },
		}
	});

	// can't pass the instructions model over the socket, so override it instead of using a view option
	NPrisonersDilemma.Views.Play = App.registerView("npd::play", PrisonersDilemma.Views.Play.Layout.extend({
		InstructionsModel: NPrisonersDilemma.Instructions
	}));

	NPrisonersDilemma.Views.Results = {};

	NPrisonersDilemma.Views.Results.Participant = Common.Views.ParticipantDisplay.extend({
		cssClass: function () {
			return "results choice-" + this.model.get("choice");
		}
	});

	NPrisonersDilemma.Views.Results.Stats = App.BaseView.extend({
		template: "app/templates/npd/results/stats",

		serialize: function () {
			return {
				payoff: this.options.payoff
			};
		},

		beforeRender: function () {
			if (this.participants.length) {
				this.setView(".results-stats", new PrisonersDilemma.Views.Results.BarChart({ participants: this.participants, stats: this.options.stats }));
			}
		},
	});

	NPrisonersDilemma.Views.Results.Layout = App.registerView("npd::results", Common.Views.SimpleLayout.extend({
		PreHeaderView: PrisonersDilemma.Views.Results.Legend,
		ParticipantView: NPrisonersDilemma.Views.Results.Participant,
		PostParticipantsView: NPrisonersDilemma.Views.Results.Stats
	}));

	NPrisonersDilemma.Views.Configure = Backbone.View.extend({
		template: "app/templates/npd/configure",
		modelOptions: _.clone(NPrisonersDilemma.config),

		events: {
			"change #r-ratio-input": "updateRratio",
			"change #h-input": "updateH"
		},

		updateRratio: function (evt) {
			this.model.set("Rratio", $(evt.target).val());
		},

		updateH: function (evt) {
			this.model.set("H", $(evt.target).val());
		},

		serialize: function () {
			return {
				Rratio: this.model.get("Rratio"),
				H: this.model.get("H")
			};
		},

		initialize: function () {
			// use defaults so we don't overwrite if already there
			_.defaults(this.model.attributes, this.modelOptions);
		}
	});

	NPrisonersDilemma.Views.AppControls = Common.Views.AppControls.extend({
		AppConfigView: NPrisonersDilemma.Views.Configure
	});


	// To be used in StateApps
	NPrisonersDilemma.States = {};
	NPrisonersDilemma.States.Play = PrisonersDilemma.States.Play.extend({
		view: "npd::play",
	});

	NPrisonersDilemma.States.Score = Common.States.Score.extend({
		assignScores: function (models) {
			// See Goehring and Kahan (1976) The Uniform N-Person Prisoner's Dilemma Game : Construction and Test of an Index of Cooperation
			var R = this.config.Rratio*(models.length - 1); // 0 < R < N-1, closer to 1 means more incentive for cooperation
			var H = this.config.H; // score increment when gaining 1 more cooperator
			var I = R*H;
			var groups = models.groupBy(function (model) { return model.get("choice") === "D" ? "defect" : "cooperate"; });
			var numCooperators = (groups.cooperate === undefined) ? 0 : groups.cooperate.length;
			var numDefectors = (groups.defect === undefined) ? 0 : groups.defect.length;

			var cooperatorPayoff = Math.round(numCooperators * H);
			var defectorPayoff = Math.round((numCooperators + 1) * H + I);
			var totalPayoff = cooperatorPayoff * numCooperators + defectorPayoff * numDefectors;
			var maxPayoff = Math.round((models.length * H) * models.length); // everyone cooperates

			models.each(function (model) {
				var choice = model.get("choice");
				if (choice === "C") {
					model.set("score", cooperatorPayoff);
				} else {
					model.set("score", defectorPayoff);
				}
			}, this);

			this.payoff = {
				cooperatorPayoff: cooperatorPayoff,
				numCooperators: numCooperators,
				defectorPayoff: defectorPayoff,
				numDefectors: numDefectors,
				totalPayoff: totalPayoff,
				maxPayoff: maxPayoff
			};
		},

		onExit: function () {
			Common.States.Score.prototype.onExit.call(this);
			return this.input.clone({ payoff: this.payoff });
		}
	});

	NPrisonersDilemma.States.Stats = PrisonersDilemma.States.Stats;

	NPrisonersDilemma.States.Results = Common.States.Results.extend({
		view: "npd::results",

		beforeRender: function () {
			Common.States.Results.prototype.beforeRender.call(this);
			console.log("input", this.input);
			this.payoff = this.input.payoff;
		},

		viewOptions: function () {
			var options = Common.States.Results.prototype.viewOptions.call(this);
			options.payoff = this.payoff;
			options.stats = this.input.stats;
			return options;
		},

		logResults: function () {
			var results = this.participants.map(function (model) {
				return {
					alias: model.get("alias"),
					choice: model.get("choice"),
					score: model.get("score"),
				};
			});
			return { results: results, payoff: this.payoff };
		},
	});

	return NPrisonersDilemma;
});