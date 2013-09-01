/**

	Multiround prisoner's dilemma

*/
define([
	// Application.
	"App",

	"framework/modules/common/Common",
	"modules/PrisonersDilemma",
	"framework/modules/Participant",

	"framework/apps/StateApp",

	"framework/util/d3/rickshaw/graphs"
],
function (App, Common, PrisonersDilemma, Participant, StateApp, Graphs) {

	var PrisonersDilemmaMulti = App.module();
	PrisonersDilemmaMulti.config = {
		scoringMatrix: {
			CC: 3,
			CD: 0,
			DC: 5,
			DD: 1
		},
		minRounds: 3,
		maxRounds: 6,
	};

	PrisonersDilemmaMulti.Views.Configure = Common.Views.ModelConfigure.Layout.extend({
		modelOptions: _.clone(PrisonersDilemmaMulti.config)
	});

	PrisonersDilemmaMulti.Views.AppControls = Common.Views.AppControls.extend({
		AppConfigView: PrisonersDilemmaMulti.Views.Configure
	});

	PrisonersDilemmaMulti.Views.Results = {};

	PrisonersDilemmaMulti.Views.Results.TimeSeries = App.BaseView.extend({
		template: "framework/templates/common/chart",

		serialize: function () {
			return this.options.stats;
		},

		afterRender: function () {
			this.renderTimeSeries();
		},

		renderTimeSeries: function () {
			var numRounds = this.options.stats.length;
			var cooperateData = _.pluck(this.options.stats, "cooperate");
			var defectData = _.pluck(this.options.stats, "defect");

			function formatData(data) {
				return _.map(data, function (elem, i) {
					return {
						x: i+1,
						y: elem.average,
						aux: elem.count + " people",
					};
				});
			}

			var timeSeries = Graphs.createTimeSeries(this, {
				graph: {
					element: this.$(".chart")[0],
					interpolation: "linear",
					series: [
						{
							data: formatData(cooperateData),
							name: 'Cooperated',
							className: "cooperated"
						}, {
							data: formatData(defectData),
							name: 'Defected',
							className: "defected"
						},
					]
				},
				xAxis: {
					ticks: numRounds,
					tickFormat: function (n) {
						if (Math.floor(n) === n) {
							return "Round " + n;
						}
					}
				},
				yAxis: {
					ticks: 5
				},

				hover: {
					xFormatter: function (n) { return "Round " + n; }
				}
			});
		},
	});

	// choose between bar chart or time series depending on data available
	PrisonersDilemmaMulti.Views.Results.Chart = App.BaseView.extend({
		beforeRender: function () {
			if (this.options.stats) {
				if (this.options.stats.length > 1) {
					this.insertView(new PrisonersDilemmaMulti.Views.Results.TimeSeries(this.options));
				} else {
					this.insertView(new PrisonersDilemma.Views.Results.BarChart(_.extend({}, this.options, { stats: this.options.stats[0] })));
				}
			}
		}
	});


	PrisonersDilemmaMulti.Views.Results.Layout =  App.registerView("pdm::results", Common.Mixins.mixin(["gameOver", "rounds"],
		PrisonersDilemma.Views.Results.Layout.extend({
			PostParticipantsView: PrisonersDilemmaMulti.Views.Results.Chart
		})
	));

	PrisonersDilemmaMulti.Views.Play = {};

	PrisonersDilemmaMulti.Views.Play.Layout = App.registerView("pdm::play", Common.Mixins.rounds(PrisonersDilemma.Views.Play.Layout.extend({
		PostParticipantsView: PrisonersDilemmaMulti.Views.Results.Chart
	})));

	// To be used in StateApps
	PrisonersDilemmaMulti.States = {};
	PrisonersDilemmaMulti.States.Play = PrisonersDilemma.States.Play.extend({
		view: "pdm::play",
		viewOptions: function () {
			var viewOptions = PrisonersDilemma.States.Play.prototype.viewOptions.apply(this, arguments);
			viewOptions.stats = this.input.stats;
			return viewOptions;
		},
	});

	PrisonersDilemmaMulti.States.Stats = PrisonersDilemma.States.Stats.extend({
		onExit: function () {
			var roundResults = this.options.roundOutputs.slice();

			// add in the current round's results
			roundResults.push(this.input.participants);

			// calculate stats
			var statsArray = _.map(roundResults, this.calculateStats, this);

			return this.input.clone({ stats: statsArray });
		}
	});

	PrisonersDilemmaMulti.States.Results = PrisonersDilemma.States.Results.extend({
		view: "pdm::results",
		beforeRender: function () {
			PrisonersDilemma.States.Results.prototype.beforeRender.call(this);
			this.config.gameOver = this.options.lastRound; // TODO: handle game over
		},


		logResults: function () {
			var results = this.participants.map(function (model, i) {
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
			}, this);

			var logData = {};
			logData["round" + this.config.round] = results;
			return logData;
		},

		onExit: function () {
			// reuse the input message to keep stats moving forward
			return this.input;
		}
	});

	PrisonersDilemmaMulti.States.Round = StateApp.RoundState.extend({
		name: "round",
		States: [ PrisonersDilemmaMulti.States.Play, PrisonersDilemma.States.Score, PrisonersDilemmaMulti.States.Stats, PrisonersDilemmaMulti.States.Results ],
		minRounds: PrisonersDilemmaMulti.config.minRounds,
		maxRounds: PrisonersDilemmaMulti.config.maxRounds,

		// what is saved between each round
		roundOutput: function (output) {
			var roundOutput = output.participants.map(PrisonersDilemma.Util.participantResults);
			return roundOutput;
		},
	});

	return PrisonersDilemmaMulti;
});