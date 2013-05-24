/**
	Base Object to make building clicker apps easier
	Requires: underscore, jQuery
						ClickerServer
 */
(function () { // wrap in function so we can "use strict"
	"use strict"

	// add Object.spawn for easy subclassing if not already present
	if (Object.spawn === undefined) {
		Object.spawn = function (parent, props) {
		  var defs = {}, key;
		  for (key in props) {
		    if (props.hasOwnProperty(key)) {
		      defs[key] = {value: props[key], enumerable: true, configurable: true, writable: true};
		    }
		  }
		  return Object.create(parent, defs);
		}
	}


	window.ClickerApp = {
		config: {},
		users: [],
		userMap: {},

		init: function () {
			ClickerServer.on("data", $.proxy(this.dataHandler, this));
			this.build();
		},

		// builds the svg
		build: function () {
			console.log("build");
		},

		// function to handle when click data comes in [{id: x, click: x}, ...]
		dataHandler: function (data) {
			console.log("data handler", data);
			console.log("this", this);
			var clicker, click, user;
			var that = this;
			_.each(data, function (dataPair) {
				clicker = dataPair.id;
				click = dataPair.click;
				user = that.getUser(clicker); // registers users on demand
				that.handleClick.apply(that, [user, click]);
			});
		},

		// simple function to facilitate entry of a single click. useful for testing.
		// doesn't go through ClickerServer.
		localClick: function (clickerId, click) {
			return this.dataHandler([{id: clickerId, click: click}]);
		},

		submitClick: function (clickerId, click) {
			ClickerServer.webClick(clickerId +":" + click);
		},

		// handles an individual click
		handleClick: function (user, click) {
			console.log("handle click");
		},

		// gets a user object, or registers a new one if it doesn't exist
		getUser: function (clicker) {
			if (this.userMap[clicker] === undefined) {
				this.addUser(clicker);
			}
			return this.userMap[clicker];
	  },

	  // registers a new user object. doesn't do any safety checks.
		addUser: function (clicker) {
			var user = { id: this.users.length, clicker: clicker }; // currently use users array as id
			this.userMap[clicker] = user;
			this.users.push(user);
		}
	};
}());
