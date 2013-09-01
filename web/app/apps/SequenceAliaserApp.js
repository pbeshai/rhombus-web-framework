
define([
	// Application.
	"App",

	"framework/apps/StateApp",

	"framework/modules/common/CommonStateApps",
	"modules/SequenceAliaser"
],

function (App, StateApp, CommonStateApps, SequenceAliaser) {

	var SequenceAliaserApp = CommonStateApps.BasicApp.extend({
		id: "seq-alias",
		version: "1.0",
		config: SequenceAliaser.config,
		States: [ SequenceAliaser.State ],
		prepend: { },

		initStateOptions: function () {
			this.stateOptions[0] = { participants: this.get("participants") };
		}
	});

	// description for use in router
	SequenceAliaserApp.app = {
		instantiate: function (attrs) {
			return new SequenceAliaserApp(attrs, { writeLogAtEnd: false });
		},
		AppControlsView: SequenceAliaser.Views.AppControls,
		title: "Sequence Aliaser"
	};

	return SequenceAliaserApp;
});