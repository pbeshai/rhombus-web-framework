/**

	A simple grid app for displaying choices

*/
define([
	// Application.
	"App",

	"framework/modules/common/Common",

	"framework/modules/Participant",

	"framework/apps/StateApp",

	"framework/util/d3/variableWidthBarChart",
	"framework/util/d3/xLine",

	"framework/util/d3/rickshaw/graphs"
],
function (App, Common, Participant, StateApp, variableWidthBarChart, xLine, Graphs) {

	var PrisonersDilemma = App.module();
	PrisonersDilemma.config = {
		scoringMatrix: {
			CC: 3,
			CD: 0,
			DC: 5,
			DD: 1
		}
	};

	PrisonersDilemma.Views.Play = {};
	PrisonersDilemma.Views.Results = {};

	PrisonersDilemma.Instructions = Common.Models.Instructions.extend({
		description: { template: "app/templates/pd/play/instructions" },
		buttonConfig: {
			"C": { description: "Cooperate" },
			"D": { description: "Defect" },
		}
	});

	PrisonersDilemma.Views.Play.Participant = Common.Views.ParticipantHiddenPlay;

	PrisonersDilemma.Views.Play.Layout = App.registerView("pd::play", Common.Views.SimpleLayout.extend({
		header: "Play",
		ParticipantView: PrisonersDilemma.Views.Play.Participant,
		InstructionsModel: PrisonersDilemma.Instructions
	}));

	PrisonersDilemma.Views.Results.Participant = Common.Views.ParticipantDisplay.extend({
		template: "app/templates/pd/results/participant",
		cssClass: function () {
			return "results choices-" + this.model.get("pairChoices");
		}
	});

	PrisonersDilemma.Views.Results.BarChart = App.BaseView.extend({
		template: "framework/templates/common/chart",

		tooltipTemplate: '<h3><%= label %></h3>' +
			'<div class="value"><span class="value"><%= value.toFixed(1) %></span> ' +
			'<span class="total-value">(<span class="<%= (value < totalAverage) ? "below" : "above" %>"><%= (value - totalAverage).toFixed(1) %></span>)</span>' +
			'</div>' +
			'<div class="count"><%= count %> <% if (count === 1) { print("person") } else { print("people") } %></div>',

		serialize: function () {
			return this.options.stats;
		},

		afterRender: function () {
			this.renderBarChart();
		},

		renderBarChart: function () {
			var stats = this.options.stats;
			var chartData = [ {
					label: "C - Cooperated",
					value: stats.cooperate.average,
					count: stats.cooperate.count
				}, {
					label: "D - Defected",
					value: stats.defect.average,
					count: stats.defect.count
				}
			];

			var chart = variableWidthBarChart()
				.tooltip(_.template(this.tooltipTemplate), {
					totalAverage: stats.total.average
				});

			d3.select(".chart").datum(chartData).call(chart);

			// add in average line
			var avgLine = xLine()
				.y(function (d) { return chart.yScale(d); })
				.width(chart.innerWidth());

			d3.select(".chart .chart-data").datum([stats.total.average]).call(avgLine);
		},
	});

	PrisonersDilemma.Views.Results.Legend = Backbone.View.extend({
		template: "app/templates/pd/results/legend"
	});

	PrisonersDilemma.Views.Results.Layout = App.registerView("pd::results", Common.Views.SimpleLayout.extend({
		header: "Results",
		PreHeaderView: PrisonersDilemma.Views.Results.Legend,
		ParticipantView: PrisonersDilemma.Views.Results.Participant,
		PostParticipantsView: PrisonersDilemma.Views.Results.BarChart
	}));

	PrisonersDilemma.Views.Configure = Backbone.View.extend({
		template: "app/templates/pd/configure",
		modelOptions: _.clone(PrisonersDilemma.config),

		events: {
			"change .pay-off-matrix input": "updateMatrix",
		},

		updateMatrix: function (evt) {
			// I guess ideally we would use a model for the scoring matrix to handle the lack of change notification
			// and ugly setting with a .get... but seems like too much hassle.
			this.model.get("scoringMatrix")[$(evt.target).data("quadrant")] = parseFloat(evt.target.value);
			this.model.trigger("change");
		},

		serialize: function () {
			return {
				scoringMatrix: this.model.get("scoringMatrix"),
			};
		},

		initialize: function () {
			// use defaults so we don't overwrite if already there
			_.defaults(this.model.attributes, this.modelOptions);
		}
	});

	PrisonersDilemma.Views.AppControls = Common.Views.AppControls.extend({
		AppConfigView: PrisonersDilemma.Views.Configure
	});


	// To be used in StateApps
	PrisonersDilemma.States = {};
	PrisonersDilemma.States.Score = Common.States.Score.extend({
		assignScore: function (model) {
			var pairChoices = model.get("choice") + model.get("partner").get("choice");
			model.set({
				"score": this.config.scoringMatrix[pairChoices],
				"pairChoices": pairChoices
			});
		},
	});

	PrisonersDilemma.States.Stats = Common.States.Stats.extend({
		calculateStats: function (participants) {
			var groups = this.group(participants, "choice");
			var stats = {
				cooperate: {
					count: this.count(groups.C),
					average: this.average(groups.C, "score")
				},
				defect: {
					count: this.count(groups.D),
					average: this.average(groups.D, "score")
				},
				total: {
					count: this.count(participants),
					average: this.average(participants, "score")
				}
			};

			return stats;
		}
	});

	PrisonersDilemma.States.Play = Common.States.Play.extend({
		view: "pd::play",
		defaultChoice: "C",
		validChoices: ["C", "D"],
	});

	PrisonersDilemma.States.Results = Common.States.Results.extend({
		view: "pd::results",

		viewOptions: function () {
			var viewOptions = Common.States.Results.prototype.viewOptions.apply(this, arguments);
			viewOptions.stats = this.input.stats;
			return viewOptions;
		},

		logResults: function () {
			var results = this.participants.map(function (model) {
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
			});

			return { results: results };
		},
	});

	PrisonersDilemma.Util = {};
	// simplify participant to just the relevant results
	PrisonersDilemma.Util.participantResults = function (participant) {
		return {
			alias: participant.get("alias"),
			score: participant.get("score"),
			choice: participant.get("choice"),
			pairChoices: participant.get("pairChoices")
		};
	};

	return PrisonersDilemma;
});