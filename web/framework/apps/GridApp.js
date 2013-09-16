/**

	Simple App for showing a grid of participants.

*/
define([
	// Application.
	"framework/App",

	"framework/apps/StateApp",

	"framework/modules/common/CommonStateApps",
	"framework/modules/Grid"
],

function (App, StateApp, CommonStateApps, Grid) {

	/**
	 *  Grid App
	 */
	var GridApp = CommonStateApps.BasicApp.extend({
		id: "grid",
		version: "1.0",
		States: [ Grid.State ],
		prepend: { attendance: false }
	});

	// description for use in router
	GridApp.app = {
		instantiate: function (attrs) {
			return new GridApp(attrs, { autoAddNew: true, writeLogAtEnd: false });
		},
		AppControlsView: undefined,
		title: "Grid"
	};

	return GridApp;
});