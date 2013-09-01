define(["backbone/backbone.layoutmanager"],

function () {

	var BaseView = Backbone.View.extend({
		restartCssAnimationFix: function (el) {
			// strange hack required to get css animation to work (http://css-tricks.com/restart-css-animation/)
			el = el ? el : this.el;
			console.log(el);
			el.offsetWidth = el.offsetWidth;
		},

		afterRender: function () {
			if (this.initialRender) {
				this.initialRender = false;
			}
		},

		initialize: function (options) {
			// move the option participants directly to the view
			if (options && options.participants) {
				this.participants = options.participants;
			}

			this.initialRender = true;
		}
	});

	return BaseView;
});