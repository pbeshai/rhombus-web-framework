/**

Ultimatum Game

Attendance -> Ultimatum Game Giver Play -> Receiver Play -> Ultimatum Game Results

*/
define([
	// Application.
	"app",

	"apps/StateApp",

	"modules/common/CommonStateApps",
	"modules/UltimatumGame"
],

function(app, StateApp, CommonStateApps, UltimatumGame) {

	/**
	 *  Team Prisoner's Dilemma App
	 */
	var UltimatumGameApp = CommonStateApps.BasicGame.extend({
		id: "ultimatum",
		version: "1.0",
		config: UltimatumGame.config,
		partnerOptions: { symmetric: false },
		botCheckOptions: false, // disable bots
		States: [ UltimatumGame.States.GiverPlay, UltimatumGame.States.ReceiverPlay, UltimatumGame.States.Score, UltimatumGame.States.Results ]
	});

	// description for use in router
	UltimatumGameApp.app = {
		instantiate: function (attrs) {
			return new UltimatumGameApp(attrs);
		},
		AppControlsView: UltimatumGame.Views.AppControls,
		title: "Ultimatum Game"
	};

	return UltimatumGameApp;
});