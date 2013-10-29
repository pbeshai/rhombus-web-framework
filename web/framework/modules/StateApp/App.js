define([
	"framework/App"
],

function (App) {
	var StateApp = Backbone.Model.extend({
		initialize: function (attrs, options) {
			// save the config as defaults and use a copy
			this.configDefaults = this.config;
			this.config = $.extend(true, {}, this.configDefaults);

			this.options = options || {};
			_.defaults(this.options, {
				writeLogAtEnd: true // default to writing a log when the final state is reached
			});

			this.logData = null;
			this.logApiCall = "apps/" + this.id + "/log";

			if (this.defineStates) {
				this.defineStates();
			} else {
				this.states = this.options.states;
			}
			var stateKeys = _.keys(this.states);

			// set up the states
			if (stateKeys.length > 0) {
				// save the key of the state in the id property
				// and add a reference to the state app
				_.each(stateKeys, function (key) {
					this.states[key].id = key;
					this.states[key].stateApp = this;
				}, this);

				this.initialState = this.states[stateKeys[0]];
				this.setCurrentState(this.states[stateKeys[0]]);
				this.loadState(this.initialState.id, this.initialInput);
			} else {
				this.clearView();
			}
			this.trigger("initialize", this);
		},

		restoreDefaultConfig: function () {
			$.extend(true, this.config, this.configDefaults);
			this.handleConfigure();
		},

		clearView: function () {
			App.controller.appController.clearView("Viewer1");
		},

		setCurrentState: function (state) {
			var prevState = this.get("currentState");
			if (prevState) {
				this.stopListening(prevState);
			}
			this.listenTo(state, "change", function () { this.trigger("change:currentState", this, state); });
			this.set("currentState", state);
		},

		loadState: function (id, input) {
			var state = this.states[id];
			if (state) {
				state.enter(input);
				this.setCurrentState(state);
			} else {
				console.log("Could not load state ", id);
			}
		},

		next: function () {
			App.controller.participantServer.ignoreChoices();
			console.log("Next State:" + this.get("currentState").nextString());
			var result = this.get("currentState").next();
			var stateApp = this;
			result.done(function (resultState) {
				if (resultState) { // only update current state if we reached a state (not null/undefined)
					stateApp.setCurrentState(resultState);

					if (!resultState.hasNext() && stateApp.options.writeLogAtEnd) {
						stateApp.writeLog();
					}
				}
				App.controller.participantServer.stopIgnoringChoices();
			});
		},

		prev: function () {
			App.controller.participantServer.ignoreChoices();
			console.log("Prev State:" + this.get("currentState").prevString());
			var result = this.get("currentState").prev();
			var stateApp = this;
			result.done(function (resultState) {
				if (resultState) {
					stateApp.setCurrentState(resultState);

					if (!resultState.hasPrev()) { // reset log if we reach the first state again
						stateApp.clearLogData();
					}
				}
				App.controller.participantServer.stopIgnoringChoices();
			});
		},

		configure: function (config) {
			// don't just set = to config in case states are referencing the existing object,
			// and in the event the full config isn't being overwritten
			_.extend(this.config, config);
			this.handleConfigure();
		},

		handleConfigure: function () {
			this.get("currentState").handleConfigure();
		},

		addLogData: function (data) {
			this.logData = _.extend(this.logData || {}, data);
		},

		clearLogData: function () {
			this.logData = null;
		},

		writeLog: function () {
			var logData = _.extend({
				config: this.config,
				version: this.version,
			}, this.logData);

			console.log("Logging", this.logApiCall, logData);
			console.log(JSON.stringify(logData)); // dump to console in case something goes wrong
			App.api({ call: this.logApiCall, type: "post", data: logData });
		},

		cleanup: function () {
			this.stopListening();
			if (this.get("currentState")) {
				this.get("currentState").cleanup();
			}
		}
	});

	return StateApp;
});