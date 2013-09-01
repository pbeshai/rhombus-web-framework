// simple jQuery function for buttons that toggle between two states
// @author pbeshai
define(["jquery"],
function (jQuery) {
	"use strict";
	if (typeof jQuery === 'undefined')
		return;

	var $ = jQuery;
	jQuery.fn.toggleButton = function (settings) {
		var defaults = {
			classState1: "state-1",
			classState2: "state-2",
			textState1: "State 1",
			textState2: "State 2",
			clickState1: null,			// function that is called when state1 button clicked
			clickState2: null,			// function that is called when state2 button clicked
		};
		return this.each(function () {
			var config = $.extend({}, defaults, settings);

			var elem = this;

			var $button = $(this);

			$button.addClass(config.classState1).text(config.textState1);

			$button.on("click", clickHandler);

			// allow programmatic changing of visual state
			$button.on("to-state1", function () { toState1(); });
			$button.on("to-state2", function () { toState2(); });

			// the main button click handler for changing appearance and firing actions
			function clickHandler() {
				if($button.hasClass(config.classState1)) {
					if (config.clickState1 !== null) {
						config.clickState1();
					}
					toState2();
				} else {
					if (config.clickState2 !== null) {
						config.clickState2();
					}
					toState1();
				}
			}

			function toState2() {
				$button.removeClass(config.classState1)
					.addClass(config.classState2).text(config.textState2);

				$button.trigger("state2");
			}

			function toState1(success) {
				$button.removeClass(config.classState2)
					.addClass(config.classState1).text(config.textState1);

				$button.trigger("state1");
			}
		});
	};

});