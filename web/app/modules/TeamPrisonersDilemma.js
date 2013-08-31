/**

	A simple grid app for displaying choices

*/
define([
	// Application.
	"app",

	"modules/common/Common",
	"modules/PrisonersDilemma",
	"modules/Participant",

	"apps/StateApp",
],
function(app, Common, PrisonersDilemma, Participant, StateApp) {

	var TeamPrisonersDilemma = app.module();
	TeamPrisonersDilemma.config = {
		group1Name: "Team 1",
		group2Name: "Team 2",
		scoringMatrix: {
			CC: 3,
			CD: 0,
			DC: 5,
			DD: 1
		}
	};

	TeamPrisonersDilemma.Views.Results = {};
	TeamPrisonersDilemma.Views.Play = {};

	TeamPrisonersDilemma.TeamsModel = Common.Models.GroupModel;

	TeamPrisonersDilemma.Views.Play.Layout = app.registerView("teampd::play", Common.Views.GroupLayout.extend({
		header: "Play",
		ParticipantView: PrisonersDilemma.Views.Play.Participant,
		InstructionsModel: PrisonersDilemma.Instructions
	}));

	TeamPrisonersDilemma.Views.Results.TeamStats = app.BaseView.extend({
		template: "teampd/results/team_stats",
		serialize: function () {
			return this.options.groupStats;
		}
	});

	TeamPrisonersDilemma.Views.Results.Layout = app.registerView("teampd::results", Common.Views.GroupLayout.extend({
		header: "Results",
		PreHeaderView: PrisonersDilemma.Views.Results.Legend,
		ParticipantView: PrisonersDilemma.Views.Results.Participant,
		PostParticipantsView: TeamPrisonersDilemma.Views.Results.TeamStats,
		PostGroupsView: PrisonersDilemma.Views.Results.BarChart
	}));

	TeamPrisonersDilemma.Views.Configure = Backbone.View.extend({
		template: "teampd/configure",
		modelOptions: _.clone(TeamPrisonersDilemma.config),

		beforeRender: function () {
			this.setView(".pd-configure", new PrisonersDilemma.Views.Configure({ model: this.model }));
			this.setView(".team-name-configure", new Common.Views.GroupConfigure({
				model: this.model,
				nameHeader: "Team Names",
				group1Label: "Team 1",
				group2Label: "Team 2"
			}));
		},

		initialize: function () {

			// use defaults so we don't overwrite if already there
			_.defaults(this.model.attributes, this.modelOptions);
		}
	});

	TeamPrisonersDilemma.Views.AppControls = Common.Views.AppControls.extend({
		AppConfigView: TeamPrisonersDilemma.Views.Configure
	});

	// To be used in StateApps
	TeamPrisonersDilemma.States = {};
	TeamPrisonersDilemma.States.Group = Common.States.Group;

	TeamPrisonersDilemma.States.Play = Common.States.GroupPlay.extend({
		view: "teampd::play",
		defaultChoice: "C", // choice made when a player does not play
		validChoices: ["C", "D"],
	});

	TeamPrisonersDilemma.States.Score = Common.States.GroupScore.extend({
		assignScore: function (participant) {
			var pairChoices = participant.get("choice") + participant.get("partner").get("choice");
			participant.set({
				"score": this.config.scoringMatrix[pairChoices],
				"pairChoices": pairChoices
			});
		},
	});

	TeamPrisonersDilemma.States.Stats = PrisonersDilemma.States.Stats.extend({
		name: "stats",
		onExit: function () {
			var overallStats = this.calculateStats(this.input.groupModel.get("participants"));
			var group1Stats = this.calculateStats(this.input.groupModel.get("group1"));
			var group2Stats = this.calculateStats(this.input.groupModel.get("group2"));

			return this.input.clone({ stats: { overall: overallStats, group1: group1Stats, group2: group2Stats } });
		},
	});

	TeamPrisonersDilemma.States.Results = Common.States.GroupResults.extend({
		view: "teampd::results",

		viewOptions: function () {
			var viewOptions = Common.States.GroupResults.prototype.viewOptions.apply(this, arguments);
			viewOptions.stats = this.input.stats.overall;
			viewOptions.group1ViewOptions = { groupStats: this.input.stats.group1 };
			viewOptions.group2ViewOptions = { groupStats: this.input.stats.group2 };

			return viewOptions;
		},

		logResults: function () {
			var modelTransform = function (model) {
				return {
					alias: model.get("alias"),
					choice: model.get("choice"),
					score: model.get("score"),
					partner: {
						alias: model.get("partner").get("alias"),
						choice: model.get("partner").get("choice"),
						score: model.get("partner").get("score"),
					},
				};
			};

			var results = {
				team1: this.groupModel.get("group1").map(modelTransform),
				team2: this.groupModel.get("group2").map(modelTransform)
			};
			return { results: results };
		},
	});

	return TeamPrisonersDilemma;
});