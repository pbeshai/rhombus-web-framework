/**

Multi-round Prisoner's Dilemma:

Attendance -> Prisoner's Dilemma Play -> Prisoner's Dilemma Results

play many rounds

*/
define([
	// Application.
	"App",

	"framework/apps/StateApp",

	"framework/modules/common/CommonStateApps",
	"modules/PrisonersDilemmaMulti"
],

function (App, StateApp, CommonStateApps, PrisonersDilemmaMulti) {
	var PrisonersDilemmaMultiApp = CommonStateApps.BasicGame.extend({
		id: "pdm",
		version: "1.0",
		config: PrisonersDilemmaMulti.config,
		States: [ PrisonersDilemmaMulti.States.Round ]

	});

	// description for use in router
	PrisonersDilemmaMultiApp.app = {
		instantiate: function (options) {
			return new PrisonersDilemmaMultiApp(options);
		},
		AppControlsView: PrisonersDilemmaMulti.Views.AppControls,
		title: "Multiround Prisoner's Dilemma"
	};

	return PrisonersDilemmaMultiApp;
});