/**
	collection of all apps. Used by the router.
*/
define([
	"app",

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
function (app, GridApp, PrisonersDilemmaApp, PrisonersDilemmaMultiApp, NPrisonersDilemmaApp,
	TeamPrisonersDilemmaApp, UltimatumGameApp, UltimatumGamePartitionedApp, CoinMatchingApp,
	SequenceAliaserApp) {

	var Apps = app.module();

	Apps.apps = {
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

	Apps.Views.Selector = Backbone.View.extend({
		template: "apps/selector",
		className: "app-selector",
		events: { "click button" : "selectApp" },

		serialize: function () {
			return { apps: Apps.apps };
		},

		selectApp : function (evt) {
			var $btn = $(evt.target);
			var selectedApp = Apps.apps[$btn.data("key")];

			$btn.removeClass("inactive").addClass("active");
			this.$("button").not($btn).addClass("inactive").removeClass("active");
			this.trigger("app-selected", selectedApp);
		},
	});
	return Apps;
});