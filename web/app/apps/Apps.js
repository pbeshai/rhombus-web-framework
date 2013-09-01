/**
	collection of all apps. Used by the router.
*/
define([
	"App",

	"apps/GridApp",
	"apps/PrisonersDilemmaApp",
	"apps/PrisonersDilemmaMultiApp",
	"apps/NPrisonersDilemmaApp",
	"apps/TeamPrisonersDilemmaApp",
	"apps/UltimatumGameApp",
	"apps/UltimatumGamePartitionedApp",
	"apps/CoinMatchingApp",
	"apps/SequenceAliaserApp"
],
function (App, GridApp, PrisonersDilemmaApp, PrisonersDilemmaMultiApp, NPrisonersDilemmaApp,
	TeamPrisonersDilemmaApp, UltimatumGameApp, UltimatumGamePartitionedApp, CoinMatchingApp,
	SequenceAliaserApp) {

	var Apps = {
		"grid": GridApp.app,
		"pd": PrisonersDilemmaApp.app,
		"pdm": PrisonersDilemmaMultiApp.app,
		"npd": NPrisonersDilemmaApp.app,
		"teampd": TeamPrisonersDilemmaApp.app,
		"ultimatum": UltimatumGameApp.app,
		"ultimatum-partitioned": UltimatumGamePartitionedApp.app,
		"coin-matching": CoinMatchingApp.app,
		"seq-alias": SequenceAliaserApp.app,
	};

	return Apps;
});