define([
	"framework/App",
	"framework/modules/StateApp/State"
],

function (App, State) {
	var debug = false;

	// a state with a view to render
	var ViewState = State.extend({
		type: "view-state",
		beforeRender: function () { }, // no-op
		afterRender: function () { }, // no-op

		// called at the start of _render after beforeRender
		setViewOptions: function () {
			this.options.viewOptions = _.extend(this.options.viewOptions || {}, this.viewOptions());
		},

		// called at the start of _render after beforeRender (to be overridden by subclasses)
		viewOptions: function () {
			/* return { }; */
		},

		run: function () {
			this.render();
			return false; // do not go to next state automatically
		},

		render: function () {
			// ignore any changes up until render since we will call loadView with the current set of participants
			App.controller.participantUpdater.ignoreChanges();
			this.beforeRender();
			this.setViewOptions();
			this._render();

			App.controller.participantUpdater.stopIgnoringChanges();
			this.afterRender();
		},

		// render the view of the state
		_render: function () {
			// render the view on an external viewer
			// TODO: Viewer1 shouldn't be hardcoded
			App.controller.appController.loadView(this.view, this.options.viewOptions, "Viewer1");
		},

		// for re-loading a view without doing any logic. (e.g. a viewer just connected and needs the current view)
		// can't simply loadView since the options are out of date.
		rerender: function () {
			this.setViewOptions();
			this._render();
		}
	});

	return ViewState;
});