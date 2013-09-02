/**

	Base objects for creating state apps

*/
define([
	// Application.
	"App",
],

function (App) {
	var debug = false;

	// object to be used for passing data between states (onEntry this.input and the output of exit)
	var StateMessage = function (data) {
		_.extend(this, data);
	};
	StateMessage.prototype.clone = function (newData) {
		var data = _.clone(this);
		for (var key in data) {
			if (!this.hasOwnProperty(key)) {
				delete data[key];
			}
		}
		data = _.extend(data, newData);
		return new StateMessage(data);
	};

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

			this.onEntry(input || this.input, prevState);

			if (input) {
				this.input = input;
			}

			var state = this;
			return this.deferRun.then(function () {
				App.controller.participantUpdater.stopIgnoringChanges();

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
			return "<span class='" + this.type + "'>" + this.toString() + "</span>";
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
	var RoundState = ViewState.extend({
		type: "round-state",
		initialize: function () {
			ViewState.prototype.initialize.apply(this, arguments);

			this.roundOutputs = [];
			this.reset();

			// handle round range
			if (this.numRounds === undefined && this.minRounds !== undefined && this.maxRounds !== undefined) {
				this.numRounds = this.minRounds + Math.round(Math.random() * (this.maxRounds - this.minRounds));
			}

			this.config.numRounds = this.numRounds;

			// initialize substates
			this.states = [];
			_.each(this.States, function (State, i) {
				var stateOptions;
				if (this.options.stateOptions) {
					stateOptions = this.options.stateOptions[i];
				}
				var state = new State(_.extend({
					config: this.config,
					roundOutputs: this.roundOutputs,
				}, stateOptions), this.stateApp);

				this.states.push(state);

				// link the states
				if (i > 0) {
					state.setPrev(this.states[i - 1]);
				}
			}, this);
		},

		isFirstState: function () {
			return this.currentState === this.states[0];
		},

		isFirstRound: function () {
			return this.roundCounter === 1;
		},

		isLastState: function () {
			return this.currentState === this.states[this.states.length - 1];
		},

		isLastRound: function () {
			return this.roundCounter === this.numRounds;
		},

		hasNext: function () {
			if (this.isLastRound() && this.isLastState()) {
				return ViewState.prototype.hasNext.call(this);
			}
			return true;
		},

		hasPrev: function () {
			if (this.isFirstRound() && this.isFirstState()) {
				return ViewState.prototype.hasPrev.call(this);
			}
			return true;
		},

		// returns what is saved after each round
		roundOutput: function (output) { },

		next: function () {
			if (this.isLastState()) {
				this.endRound();

				// final state, final round -> leave the round state
				if (this.isLastRound()) {
					var newState = State.prototype.next.apply(this, arguments);
					if (newState == null) { // we didn't leave (e.g. last state of app)
						this.undoEndRound();
					} else {
						return newState;
					}
				} else {
					// start new round
					this.newRound(this.lastOutput);
					this.trigger("change");
				}
			} else { // not final state in round, so go to next
				this.currentState = this.currentState.next();
				this.trigger("change");
			}

			return this;
		},

		prev: function () {
			if (this.isFirstState()) {
				this.undoEndRound();

				// first state, first round -> leave the round state
				if (this.isFirstRound()) {
					var newState = State.prototype.prev.apply(this, arguments);
					if (newState == null) { // we didn't leave (e.g. first state of app)
						this.endRound();
					} else {
						return newState;
					}
				} else {
					this.undoNewRound();
					this.trigger("change");
				}
			} else {
				this.currentState = this.currentState.prev();
				this.trigger("change");
			}

			return this;
		},

		// used when prev'ing into an old round
		undoEndRound: function () {
			// put lastOutput as the previous rounds output
			this.lastOutput = this.roundOutputs[this.roundOutputs.length - 2];

			// delete the old round output
			this.roundOutputs.pop();
		},

		// after last state in round
		endRound: function () {
			// exit the final state
			this.lastOutput = this.currentState.exit();

			// save the round output
			this.roundOutputs.push(this.roundOutput(this.lastOutput));
		},

		// used when prev'ing into an old round
		undoNewRound: function () {
			this.roundCounter -= 1;
			this.config.round = this.roundCounter;
			this.currentState = this.states[this.states.length - 1];

			_.each(this.states, function (s) { s.options.lastRound = this.isLastRound(); }, this);

			this.currentState.enter.call(this.currentState);
		},

		// start at first state of round
		newRound: function (input) {
			this.roundCounter += 1;
			this.config.round = this.roundCounter;
			this.currentState = this.states[0];

			_.each(this.states, function (s) { s.options.lastRound = this.isLastRound(); }, this);

			this.currentState.enter.call(this.currentState, input);
		},

		reset: function () {
			this.roundCounter = 0;
			this.config.round = 0;
			this.stateCounter = 0;
			this.currentState = null;
			this.roundOutputs.length = 0;
		},

		run: function () {
			this.reset();
			this.newRound(this.input);

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
			return this.currentState.exit().clone({ roundOutputs: this.roundOutputs });
		},

		// for debugging / logging
		nextString: function () {
			if (this.isLastState()) {
				if (this.isLastRound()) {
					return State.prototype.nextString.call(this);
				}
			}
			var stateCounter = _.indexOf(this.states, this.currentState) + 1;

			var nextStateCounter = (stateCounter % this.states.length) + 1;
			var nextRoundCounter = (stateCounter < nextStateCounter) ? this.roundCounter : this.roundCounter + 1;

			var str = this.stateString(stateCounter, this.roundCounter) +
					" -> " + this.stateString(nextStateCounter, nextRoundCounter);

			return str;
		},

		stateString: function (stateCounter, roundCounter) {
			return (this.name || this.id) + "[" + roundCounter + "][" + stateCounter + "] " + this.states[stateCounter - 1].toString();
		},

		// for debugging / logging
		prevString: function () {
			if (this.isFirstState()) {
				if (this.isFirstRound()) {
					return State.prototype.prevString.call(this);
				}
			}
			var stateCounter = _.indexOf(this.states, this.currentState) + 1;

			var prevStateCounter = (stateCounter === 1) ? this.states.length : stateCounter - 1;
			var prevRoundCounter = (stateCounter > prevStateCounter) ? this.roundCounter : this.roundCounter - 1;

			var str = this.stateString(prevStateCounter, prevRoundCounter) +
					" <- " + this.stateString(stateCounter, this.roundCounter);

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
			return (this.name || this.id) + "["+this.numRounds+" x (" + statesString+ ")]";
		},

		toHtml: function () {
			var currentState = this.currentState;
			var statesString = _.invoke(this.states, function (state) {
				var str = this.toHtml();
				if (this === currentState) {
					str = "<span class='active'>" + str + "</span>";
				}
				return str;
			}).join(" ");
			return (this.name || this.id) + ": "+ this.roundCounter + " of "+this.numRounds+": " + statesString;
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
			}
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
			App.api({ call: this.logApiCall, type: "post", data: logData });
		},

		cleanup: function () {
			if (this.get("currentState")) {
				this.get("currentState").cleanup();
			}
		}
	});

	return {
		State: State,
		StateMessage: StateMessage,
		ViewState: ViewState,
		RoundState: RoundState,
		App: StateApp,
	};
});