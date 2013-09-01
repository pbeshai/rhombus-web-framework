/**

Coin Matching Game

Attendance -> Play -> Results

*/
define([
	// Application.
	"App",

	"framework/apps/StateApp",

	"framework/modules/common/CommonStateApps",
	"modules/CoinMatching"
],

function (App, StateApp, CommonStateApps, CoinMatching) {

	// Attendance -> Phase 1 (Play) -> Phase 1 (Results) -> Phase 2 Play -> Phase 2 Results -> Total Results -> ...
	var CoinMatchingApp = CommonStateApps.PhaseGame.extend({
		id: "coin-matching",
		version: "1.0",
		config: CoinMatching.config,
		prepend: { attendance: true, botCheck: true, group: true },
		PhaseStates: [
			[ CoinMatching.States.Round, CoinMatching.States.PhaseTotalBucket, CoinMatching.States.PhaseResults ],
			[ CoinMatching.States.Round, CoinMatching.States.PhaseTotalBucket, CoinMatching.States.PhaseResults, CoinMatching.States.TotalBucket, CoinMatching.States.TotalResults ],
			[ CoinMatching.States.Round, CoinMatching.States.PhaseTotalBucket, CoinMatching.States.PhaseResults, CoinMatching.States.TotalBucket, CoinMatching.States.TotalResults ],
			[ CoinMatching.States.Round, CoinMatching.States.PhaseTotalBucket, CoinMatching.States.PhaseResults, CoinMatching.States.TotalBucket, CoinMatching.States.TotalResults ],
		],
		phaseConfigs: [
			{ group1NameSuffix: "Human", group2NameSuffix: "Human" },
			{ group1NameSuffix: "Human", group2NameSuffix: "Computer" },
			{ group1NameSuffix: "Computer", group2NameSuffix: "Human" },
			{ group1NameSuffix: "Computer", group2NameSuffix: "Computer" },
		],

		getPhaseStateOptions: function (phaseIndex, stateIndex) {
			var phaseNum = phaseIndex + 1;
			switch (stateIndex) {
				case 0: // options for Round
					return _.extend({
						config: this.phaseConfigs[phaseIndex],
						stateOptions:
						[
							{ viewOptions: { header: "Play Phase " + phaseNum } },
							undefined, // score
							{ viewOptions: { header: "Results Phase " + phaseNum } }
						]
					});

				case 1: // options for phase total bucket
					return { phase: phaseNum };

				case 2: // options for phase results
					return {
						config: this.phaseConfigs[phaseIndex],
						phase: phaseNum,
						viewOptions: {
							header: "Results for Phase " + phaseNum
						}
					};

				case 4: // options for total results
					return {
						config: this.config,
						numPhases: phaseNum,
						viewOptions: {
							header: "Total Results after Phase " + phaseNum
						}
					};
			}
		},

		handleConfigure: function () {
			// update numrounds in each of the rounds
			_.each(this.states, function (state) {
				if (state instanceof StateApp.RoundState) {
					state.numRounds = this.config.roundsPerPhase;
				}
			}, this);

			CommonStateApps.PhaseGame.prototype.handleConfigure.call(this);
		},
	});

	// description for use in router
	CoinMatchingApp.app = {
		instantiate: function (attrs) {
			return new CoinMatchingApp(attrs);
		},
		AppControlsView: CoinMatching.Views.AppControls,
		title: "Coin Matching Game"
	};

	return CoinMatchingApp;
});