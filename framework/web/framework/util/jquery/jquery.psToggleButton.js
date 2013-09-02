// simple jQuery function for buttons that toggle between two states and wait for participant server (ps) events in between
// @author pbeshai
define(["jquery"],
function (jQuery) {
	"use strict";

	if (typeof jQuery === 'undefined')
		return;
	var $ = jQuery;

	jQuery.fn.psToggleButton = function (settings) {
		var defaults = {
			classState1: "state-1",
			classState2: "state-2",
			classPending: "state-pending",
			textState1: "State 1",
			textState2: "State 2",
			clickState1: null,			// function that is called when state1 button clicked
			clickState2: null,			// function that is called when state2 button clicked
			state1to2Event: null,		// string event name from Participant Server
			state2to1Event: null,		// string event name from Participant Server
			participantServer: null
		};
		return this.each(function () {
			var config = $.extend({}, defaults, settings);

			var elem = this;

			var $button = $(this);

			$button.addClass(config.classState1).text(config.textState1);

			$button.on("click", clickHandler);
			if (config.state1To2Event !== null && config.participantServer) {
				config.participantServer.on(config.state1To2Event, toState2);
			}
			if (config.state2To1Event !== null && config.participantServer) {
				config.participantServer.on(config.state2To1Event, toState1);
			}

			// allow programmatic changing of visual state
			$button.on("to-state1", function () { toState1(true); });
			$button.on("to-state2", function () { toState2(true); });

			// the main button click handler for changing appearance and firing actions
			function clickHandler() {
				if($button.hasClass(config.classState1)) {
					if (config.clickState1 !== null) {
						config.clickState1();
					}
				} else {
					if (config.clickState2 !== null) {
						config.clickState2();
					}
				}
				$button.addClass(config.classPending).addClass("disabled").prop("disabled", true);
			}

			function toState2(success) {
				if (!success) return toState1(true); // abort

				$button.removeClass(config.classPending).removeClass(config.classState1)
					.removeClass("disabled").prop("disabled", false)
					.addClass(config.classState2).text(config.textState2);
			}

			function toState1(success) {
				if (!success) return toState2(true); // abort

				$button.removeClass(config.classPending).removeClass(config.classState2)
					.removeClass("disabled").prop("disabled", false)
					.addClass(config.classState1).text(config.textState1);
			}
		});
	};

});