/**

	Base objects for creating state apps

*/
define([
	// Application.
	"framework/App",
	"framework/modules/common/CommonModels"
],

function (App, CommonModels) {
	var debug = false;

	// object to be used for passing data between states (onEntry this.input and the output of exit)
	var StateMessage = function (data) {
		_.extend(this, data);
	};
	_.extend(StateMessage.prototype, {
		clone: function (newData) {
			var data = _.clone(this);
			for (var key in data) {
				if (!this.hasOwnProperty(key)) {
					delete data[key];
				}
			}
			data = _.extend(data, newData);
			return new StateMessage(data);
		},
	});

	// used to save state
	var StateMessageSnapshot = function (data) {
		_.extend(this, data);
		this.snapshot = true;

		if (this.groupModel) {
			this.groupModel = this.groupModel.toJSON();
		} else if (this.participants) {
			this.participants = this.participants.toJSON();
		}
	};
	_.extend(StateMessageSnapshot.prototype, {
		// returns a real working StateMessage for live use
		activate: function (message) {
			var result;
			// update an existing message
			if (message != null) {
				result = _.extend(message.clone(), _.omit(this, "groupModel", "participants"));

				// TODO: for now assume message not null
				if (this.groupModel && result.groupModel) {
					result.groupModel.restore(this.groupModel);
				} else if (this.participants && result.participants) {
					result.participants.restore(this.participants);
				}
			}
			return result;
		}
	});

	// define the State prototype object
	var State = function (options, stateApp) {
		this.options = _.defaults({}, options, this.defaults);
		this.stateApp = stateApp;
		this.initialize();
	};
	State.extend = Backbone.Model.extend; // use Backbone's extend for subclassing
	_.extend(State.prototype, Backbone.Events, {
		type: "state",
		initialize: function () {
			this.id = undefined;
			this.flow = { next: undefined, prev: undefined };
			this.view = this.view || this.options.view;
			this.config = this.options.config;
			this.name = this.options.name || this.name;
		},

		setNext: function (nextState, mutual) {
			mutual = (mutual === undefined) ? true : mutual; // default to mutual
			this.flow.next = nextState;
			if (nextState && mutual) {
				nextState.flow.prev = this;
			}
		},

		setPrev: function (prevState, mutual) {
			mutual = (mutual === undefined) ? true : mutual; // default to mutual
			this.flow.prev = prevState;

			if (prevState && mutual) {
				prevState.flow.next = this;
			}
		},

		// return value becomes this.input
		onEntry: function (input, prevState) {
			this.deferRun.resolve();
		},

		// enter the state
		enter: function (input, prevState) {
			this.deferRun = $.Deferred();

			// states will update in the run phase, so do not needlessy update now.
			App.controller.participantUpdater.ignoreChanges();

			if (debug) { console.log("[state:"+this.toString()+"] enter" + ((prevState !== undefined) ? " from " + prevState.toString() : "" )); }

			if (input) {
				this.inputSnapshot = new StateMessageSnapshot(input);
			} else if (input == null && this.inputSnapshot) {
				input = this.inputSnapshot.activate(this.input);
			}

			this.trigger("entry", input, prevState);
			this.onEntry(input || this.input, prevState);

			if (input) {
				this.input = input;
			}

			var state = this;
			return this.deferRun.then(function () {
				App.controller.participantUpdater.stopIgnoringChanges();

				// add new participants if the state supports it
				if (state.addNewParticipants) {
					state.addNewParticipants();
				}

				var autoFlow = state.run();
				if (autoFlow !== false) {
					if (prevState === state.flow.next) {
						return state.prev();
					} else {
						return state.next();
					}
				}
				return state;
			});
		},

		run: function () { }, // return false to not automatically go to next state

		exit: function () {
			if (debug) { console.log("[state:"+this.toString()+"] exit"); }

			// ignore changes before exiting, since new state will be coming on which will
			// interpret changes and load a view with the updates
			App.controller.participantUpdater.ignoreChanges();

			var output = this.onExit() || this.input;
			this.trigger("exit", output);
			App.controller.participantUpdater.stopIgnoringChanges();

			this.cleanup();

			return output;
		},

		onExit: function () {  }, // this can return a value to modify the output (default is the input)

		cleanup: function () {
			this.stopListening();
		},

		validateNext: function () { return true; },
		validatePrev: function () { return true; },

		hasNext: function () {
			return this.flow.next != null;
		},

		hasPrev: function () {
			return this.flow.prev != null;
		},

		// go to the next state
		next: function () {
			if (!this.validateNext()) {
				return false;
			}

			if (this.flow.next) {
				// returns a Promise that returns the state
				return this.flow.next.enter(this.exit(), this);
			}

			// wrap the result in a promise
			var state = this;
			return $.Deferred(function () { this.resolve(); }).then(function () { return state.flow.next; });
		},

		// go to the previous state
		prev: function () {
			if (!this.validatePrev()) {
				return false;
			}

			if (this.flow.prev) {
				return this.flow.prev.enter(undefined, this); // returns a promise
			}

			// wrap the result in a promise
			var state = this;
			return $.Deferred(function () { this.resolve(); }).then(function () { return state.flow.prev; });
		},

		// for debugging / logging
		nextString: function () {
			var nextState = this.flow.next ? this.flow.next.toString() : "#";
			return this.toString() + " -> " + nextState;
		},

		// for debugging / logging
		prevString: function () {
			var prevState = this.flow.prev ? this.flow.prev.toString() : "#";
			return prevState + " <- " + this.toString();
		},

		toString: function () {
			return this.name || this.id;
		},

		toHtml: function () {
			return "<span class='state type-" + this.type + "'>" + this.toString() + "</span>";
		},

		// commonly used to log results via an API call
		log: function (data) {
			if (data) {
				this.stateApp.addLogData(data);
			}
		},

		// can be called when a state app configures itself (perhaps a new config is set)
		handleConfigure: function () {}
	});

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

	// a collection of states that is run through repeatedly before exiting
	var MultiState = ViewState.extend({
		type: "multi-state",
		stateOutputsKey: "stateOutputs", // can be customized for easier reading (e.g., roundOutputs)
		initialize: function () {
			ViewState.prototype.initialize.apply(this, arguments);

			this[this.stateOutputsKey] = [];
			this.reset();

			var that = this;
			// initialize substates
			this.states = [];
			_.each(this.States, function (State, i) {
				var stateOptions;
				if (this.options.stateOptions) {
					stateOptions = this.options.stateOptions[i];
				}

				var stateOutputsOption = {};
				stateOutputsOption[this.stateOutputsKey] = this[this.stateOutputsKey];

				stateOptions = _.extend({
						config: this.config,
						stateIndex: i,
						parentOptions: this.options,
					}, stateOutputsOption, stateOptions);
				// make the state index available in the views
				if (!stateOptions.viewOptions) {
					stateOptions.viewOptions = {};
				}
				stateOptions.viewOptions.stateIndex = i;

				stateOptions = this.setSubstateOptions(i, stateOptions);

				var state = new State(stateOptions, this.stateApp);

				this.states.push(state);

				state.on("entry", function (input, prevState) {
					if (i === that[that.stateOutputsKey].length - 1) {
						that[that.stateOutputsKey].pop();
					} else if (that[that.stateOutputsKey][i]) {
						that[that.stateOutputsKey][i] = undefined;
					}
				});

				state.on("exit", function (output) {
					that[that.stateOutputsKey][i] = that.stateOutput(output);
				});

				// link the states
				if (i > 0) {
					state.setPrev(this.states[i - 1]);
				}
			}, this);
		},

		setSubstateOptions: function (index, options) {
			return options;
		},

		isFirstState: function () {
			return this.currentState === this.states[0];
		},

		// the complex MultiState check allows nesting of MultiStates
		isFirstStateDeep: function () {
			return this.isFirstState() &&
				((this.currentState instanceof MultiState && this.currentState.isFirstState()) ||
				!(this.currentState instanceof MultiState));
		},

		isLastState: function () {
			return this.currentState === this.states[this.states.length - 1];
		},

		// the complex MultiState check allows nesting of MultiStates
		isLastStateDeep: function () {
			return this.isLastState() &&
				((this.currentState instanceof MultiState && this.currentState.isLastState()) ||
				!(this.currentState instanceof MultiState));
		},

		hasNext: function () {
			if (this.isLastState()) {
				return ViewState.prototype.hasNext.call(this);
			}
			return true;
		},

		hasPrev: function () {
			if (this.isFirstState()) {
				return ViewState.prototype.hasPrev.call(this);
			}
			return true;
		},

		// returns what is saved after each state
		stateOutput: function (output) { },

		next: function () {
			var multiState = this;
			// do deep to handle nested multistates
			if (this.isLastStateDeep()) {
				var newState = State.prototype.next.apply(this, arguments);
				if (newState != null) { // we left the multistate (may not if there is no state that follows)
					return newState;
				}
			} else { // not final state, so go to next
				this.currentState.next().done(function (resultState) {
					multiState.currentState = resultState;

					multiState.trigger("change");
				});
			}
			// return a promise that simply contains the multiState (we're still inside it)
			return $.Deferred(function () { this.resolve(); }).then(function () { return multiState; });
		},

		prev: function () {
			var multiState = this;
			// the complex MultiState check allows nesting of MultiStates
			if (this.isFirstStateDeep()) {
					var newState = State.prototype.prev.apply(this, arguments);
					if (newState != null) { // we left (might not if first state -- no previous to go to)
						return newState;
					}
			} else {
				this.currentState.prev().done(function (resultState) {
					multiState.currentState = resultState;
					multiState.trigger("change");
				});
			}

			return $.Deferred(function () { this.resolve(); }).then(function () { return multiState; });
		},

		reset: function () {
			this.currentState = null;
			this[this.stateOutputsKey].length = 0;
		},

		run: function () {
			if (this.currentState == null) {
				this.currentState = this.states[0];
			}

			// if it is first state, load with the input we received, otherwise
			// load with whatever input snaphsot it has (to support previous)
			if (this.currentState === this.states[0]) {
				this.currentState.enter.call(this.currentState, this.input);
			} else {
				this.currentState.enter.call(this.currentState);
			}


			return false; // do not automatically flow to next state
		},

		// delegate to current state
		render: function () {
			this.currentState.render();
		},

		rerender: function () {
			this.currentState.rerender();
		},

		onExit: function () {
			var stateOutputsOption = {};
			stateOutputsOption[this.stateOutputsKey] = this[this.stateOutputsKey];

			return this.currentState.exit().clone(stateOutputsOption);
		},

		// for debugging / logging
		nextString: function () {
			if (this.isLastState()) {
				return State.prototype.nextString.call(this);
			}
			var stateCounter = _.indexOf(this.states, this.currentState) + 1;

			var nextStateCounter = (stateCounter % this.states.length) + 1;

			var str = this.stateString(stateCounter) +
					" -> " + this.stateString(nextStateCounter);

			return str;
		},

		stateString: function (stateCounter) {
			return (this.name || this.id) + "[" + stateCounter + "] " + this.states[stateCounter - 1].toString();
		},

		// for debugging / logging
		prevString: function () {
			if (this.isFirstState()) {
				return State.prototype.prevString.call(this);
			}
			var stateCounter = _.indexOf(this.states, this.currentState) + 1;

			var prevStateCounter = (stateCounter === 1) ? this.states.length : stateCounter - 1;

			var str = this.stateString(prevStateCounter) +
					" <- " + this.stateString(stateCounter);

			return str;
		},

		toString: function () {
			var statesString = _.invoke(this.states, function (state) {
				var str = this.toString();
				if (this.type !== "view-state") {
					str = "[" + str + "]";
				}
				return str;
			}).join(", ");
			return (this.name || this.id) + "[" + statesString+ "]";
		},

		toHtml: function () {
			var currentState = this.currentState;
			var statesString = _.invoke(this.states, function (state) {
				var str = this.toHtml();
				if (this === currentState) {
					str = "<span class='active'>" + str + "</span>";
				} else {
					str = "<span class='inactive'>" + str + "</span>";
				}
				return str;
			}).join(" ");
			return (this.name || this.id) + ": " + statesString;
		},

		// delegate to current state
		addNewParticipants: function (render) {
			if (this.currentState && this.currentState.addNewParticipants) {
				this.currentState.addNewParticipants(render);
			}
		},

		// delegate to current state
		handleConfigure: function () {
			if (this.currentState) {
				this.currentState.handleConfigure();
			}
		}
	});

	var RepeatState = MultiState.extend({
		initialize: function () {
			// handle round range
			if (this.numRepeats === undefined && this.minRepeats !== undefined && this.maxRepeats !== undefined) {
				this.numRepeats = this.minRepeats + Math.round(Math.random() * (this.maxRepeats - this.minRepeats));
			}

			// expand the State into many states
			this.States = [];
			var stateOptions = this.options.stateOptions; // not an array
			this.options.stateOptions = [];
			for (var i = 0; i < this.numRepeats; i++) {
				this.States.push(this.State);
				var options = _.extend({}, stateOptions);
				// duplicate the 'repeat options' for the child repeated state
				if (this.options.repeatOptions) {
					options.stateOptions = this.options.repeatOptions;
				}

				if (!options.name) {
					options.name = this.State.prototype.name + " " + (i + 1);
				}

				this.options.stateOptions.push(options);
			}



			MultiState.prototype.initialize.apply(this, arguments);

			// TODO: review this config thing.. seems questionable.
			this.config.numRepeats = this.numRepeats;
		}
	});

	/**
	 * State App - prototype object
	 */
	var StateApp = Backbone.Model.extend({
		initialize: function (attrs, options) {
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

	return {
		State: State,
		StateMessage: StateMessage,
		ViewState: ViewState,
		MultiState: MultiState,
		RepeatState: RepeatState,
		App: StateApp,
	};
});