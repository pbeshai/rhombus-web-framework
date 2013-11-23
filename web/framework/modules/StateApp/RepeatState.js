define([
	"framework/App",

	"framework/modules/StateApp/MultiState"
],

function (App, MultiState) {
	var RepeatState = MultiState.extend({
		initialize: function () {
			// handle round range
			if (this.numRepeats === undefined && this.minRepeats !== undefined && this.maxRepeats !== undefined) {
				this.numRepeats = this.minRepeats + Math.round(Math.random() * (this.maxRepeats - this.minRepeats));
			}

			// expand the State into many states
			this.States = [];
			this.initialStateOptions = this.options.stateOptions; // an object (not an array)
			this.options.stateOptions = [];
			for (var i = 0; i < this.numRepeats; i++) {
				this.addRepeat();
			}

			MultiState.prototype.initialize.apply(this, arguments);

			// TODO: review this config thing.. seems questionable.
			this.config.numRepeats = this.numRepeats;
		},

		addRepeat: function (init) {
			this.States.push(this.State);
			var num = this.States.length;

			var options = _.extend({}, this.initialStateOptions);
			// duplicate the 'repeat options' for the child repeated state
			if (this.options.repeatOptions) {
				options.stateOptions = this.options.repeatOptions;
			}

			if (!options.name) {
				options.name = this.State.prototype.name + " " + num; // e.g. round 1
			}

			this.options.stateOptions.push(options);

			if (init) {
				this.setState(this.States[this.States.length - 1], this.States.length - 1);
			}
		},

		setRepeats: function (newNumRepeats) {
			var origNumRepeats = this.numRepeats;
			if (newNumRepeats < origNumRepeats) {
				// remove some substates
				this.States.splice(newNumRepeats);
				this.states.splice(newNumRepeats);
				this.states[newNumRepeats - 1].setNext(null);
				this.options.stateOptions.splice(newNumRepeats);

				// removed the current state
				if (this.currentState && this.currentState.options.stateIndex >= this.states.length) {
					this.currentState = this.states[this.states.length - 1];
				}

				this.numRepeats = newNumRepeats;
				this.trigger("change");


			} else if (newNumRepeats > origNumRepeats) {
				// add more repeats
				for (var i = 0; i < newNumRepeats - origNumRepeats; i++) {
					this.addRepeat(true);
				}

				this.numRepeats = newNumRepeats;
				this.trigger("change");
			}
		},
	});

	return RepeatState;
});