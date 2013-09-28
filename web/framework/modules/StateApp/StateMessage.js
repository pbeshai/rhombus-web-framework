define([
	"framework/App",
],

function (App) {
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

				if (this.groupModel && result.groupModel) {
					result.groupModel.restore(this.groupModel);
				} else if (this.participants && result.participants) {
					result.participants.restore(this.participants);
				}
			}
			return result;
		}
	});

	return {
		Message: StateMessage,
		Snapshot: StateMessageSnapshot
	};
});