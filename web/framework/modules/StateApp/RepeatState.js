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

	return RepeatState;
});