/** Base class for mixing in event handling functionality
 */
(function () {
	"use strict"
	window.EventHandler = {
		eventHandlerMap: null,
		handlerObj: null, // the "this" in the event callback

		init: function (handlerObj) {
			this.handlerObj = handlerObj;
			this.eventHandlerMap = {};
		},

		// call all handlers for an event
		trigger: function (event, args) {
			// if we have defined it
			var handlers = this.eventHandlerMap[event];
			if (handlers !== undefined) {

				var handlerObj = this.handlerObj || this;
				for (var i = 0; i < handlers.length; i++) {
					handlers[i].apply(handlerObj, args);
				}
			}
		},

		// register a handler for an event
		on: function (event, handler) {
			if (this.eventHandlerMap[event] === undefined) {
				this.eventHandlerMap[event] = [ handler ];
			} else {
				this.eventHandlerMap[event].push(handler);
			}
		}
	};
}());