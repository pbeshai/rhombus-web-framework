define([
	"framework/App",
	"framework/modules/StateApp/StateMessage"
],

function (App, StateMessage) {
	var debug = false;

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
				this.inputSnapshot = new StateMessage.Snapshot(input);
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
		log: function (data, write) {
			if (data) {
				this.stateApp.addLogData(data);
			}
			if (write) { // can use the write argument as a 'flags' object
				this.stateApp.writeLog(_.isObject(write) ? write : undefined);
			}
		},

		// a hook for states to be updated (Typically via update-controller call in AppController)
		// e.g. a view sends an update
		update: function (data) {},

		// can be called when a state app configures itself (perhaps a new config is set)
		handleConfigure: function (active) {}
	});

	return State;
});