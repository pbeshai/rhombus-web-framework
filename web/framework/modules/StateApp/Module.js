define([
	"framework/App",

	"framework/modules/StateApp/State",
	"framework/modules/StateApp/StateMessage",
	"framework/modules/StateApp/ViewState",
	"framework/modules/StateApp/MultiState",
	"framework/modules/StateApp/RepeatState",
	"framework/modules/StateApp/App",
],

function (App, State, StateMessage, ViewState, MultiState, RepeatState, StateApp) {
	return {
		State: State,
		StateMessage: StateMessage.Message,
		StateMessageSnapshot: StateMessage.Snapshot,
		ViewState: ViewState,
		MultiState: MultiState,
		RepeatState: RepeatState,
		App: StateApp,
	};
});