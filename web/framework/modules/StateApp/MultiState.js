define([
	"framework/App",
	"framework/modules/StateApp/State",
	"framework/modules/StateApp/ViewState"
],

function (App, State, ViewState) {

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
			if (this.isLastStateDeep()) {
				return ViewState.prototype.hasNext.call(this);
			}
			return true;
		},

		hasPrev: function () {
			if (this.isFirstStateDeep()) {
				return ViewState.prototype.hasPrev.call(this);
			}
			return true;
		},

		// returns what is saved after each state
		stateOutput: function (output) { },

		next: function () {
			// TODO: the samed defer complexity that was added to prev should be added here
			// to support having the case where the last state in the multistate is an autoflow
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

			var defer = $.Deferred();
			var prevState = this;
			var promise = defer.then(function () { return prevState; });

			// the complex MultiState check allows nesting of MultiStates
			if (this.isFirstStateDeep()) {
					var newState = State.prototype.prev.apply(this, arguments);
					if (newState != null) { // we left (might not if first state -- no previous to go to)
						return newState;
					}
					defer.resolve();
			} else {
				this.currentState.prev().done(function (resultState) {
					if (resultState == null) { // prev'd past first in multistate (possible if non view states -- auto flow)
						prevState = State.prototype.prev.apply(multiState, arguments);
						if (prevState == null) { // we did not leave this state, reset prevState to this
							prevState = multiState;
						}
					}

					multiState.currentState = resultState;
					multiState.trigger("change");

					defer.resolve();
				});
			}

			return promise;
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
			var promise;
			if (this.currentState === this.states[0]) {
				promise = this.currentState.enter.call(this.currentState, this.input);
			} else {
				promise = this.currentState.enter.call(this.currentState);
			}

			var multiState = this;
			promise.done(function (resultState) {

				if (resultState && multiState.currentState !== resultState) {
					console.log("promise finished with new result state", multiState.currentState, resultState);
					multiState.currentState = resultState;
				}
			});


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

	return MultiState;
});