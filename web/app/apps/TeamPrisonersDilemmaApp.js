/**

Team Prisoner's Dilemma:

Attendance -> Team Prisoner's Dilemma Play -> Team Prisoner's Dilemam Results

*/
define([
	// Application.
	"app",

	"apps/StateApp",

	"modules/common/CommonStateApps",
	"modules/TeamPrisonersDilemma"
],

function(app, StateApp, CommonStateApps, TeamPrisonersDilemma) {

	var TeamPrisonersDilemmaApp = CommonStateApps.BasicGame.extend({
		id: "teampd",
		version: "1.0",
		config: TeamPrisonersDilemma.config,
		States: [ TeamPrisonersDilemma.States.Play, TeamPrisonersDilemma.States.Score, TeamPrisonersDilemma.States.Stats, TeamPrisonersDilemma.States.Results ],
		prepend: { attendance: true, botCheck: true, group: true }
	});

	// description for use in router
	TeamPrisonersDilemmaApp.app = {
		instantiate: function (attrs) {
			return new TeamPrisonersDilemmaApp(attrs);
		},
		AppControlsView: TeamPrisonersDilemma.Views.AppControls,
		title: "Team Prisoner's Dilemma"
	};

	return TeamPrisonersDilemmaApp;
});