/*
	Class for representing a virtual clicker.
	Requires: jQuery
						EventHandler
*/

(function () {
	"use strict"
	var clickerId = 0;

	window.ClickerInput = {
		$elem: null,
		id: null,
		config: {
			values: ["A","B","C","D","E"]
		},
		eventHandler: null,
		enabled: false,

		init: function (settings) {
			console.log("init with clickerId = "+clickerId);
			var that = this;
			var config = this.config = $.extend({}, this.config, settings);

			// init internal event handler
			this.eventHandler = Object.create(EventHandler);
			this.eventHandler.init(this);

			var $elem = this.$elem = $("<div id='clicker-"+clickerId+"' class='clicker'></div>");

			// initialize ID
			var $id = $("<input class='clicker-id input-block-level' type='text' placeholder='Clicker ID' />").appendTo(this.$elem);
			this.setId(this.config.id);
			$id.on("change", function () { that.id = this.value;});

			// initialize buttons
			var initButton = function (vote) {
				var $btn = $("<button class='btn btn-block clicker-btn clicker-btn-"+vote+"'>"+vote+"</button>");
				if (config.labels !== undefined && config.labels[vote] !== undefined) {
					$btn.html("<b>"+vote+"</b> "+config.labels[vote]).addClass("labeled");
				}

				$btn.on("click", $.proxy(function () { that.vote(vote); }, that));

				return $btn.appendTo($elem);
			}
			for (var i = 0; i < this.config.values.length; i++) {
				initButton(this.config.values[i]);
			}


			// disable when clicks are disabled
			if (typeof ClickerServer !== "undefined") {
				ClickerServer.on("enable-clicks", $.proxy(function (success) {
					if (success) {
						that.enable();
					}
				}, that));
				ClickerServer.on("disable-clicks", $.proxy(function (success) {
					if (success) {
						that.disable();
					}
				}, that));

				ClickerServer.on("status", $.proxy(function (state) {
					if (state.acceptingVotes) {
						that.enable();
					} else {
						that.disable();
					}
				}, that));

				ClickerServer.on("disconnect", $.proxy(that.disable, that));
			}
			this.disable(); // start disabled

			// attach to DOM
			if (this.config.parent !== undefined) {
				this.$elem.appendTo(this.config.parent);
			}

			return this; // allow cascade
		},

		setId: function (id) {
			if (id === undefined) { // give a numeric id
				id = clickerId++;
			}

			this.id = id;
			this.$elem.find(".clicker-id").val(id); // update text field

			return this; // allow cascade
		},

		// disables the buttons
		disable: function () {
			this.$elem.find("button").prop("disabled", true).addClass("disabled");
			this.enabled = false;
		},

		// enables the buttons
		enable: function () {
			this.$elem.find("button").prop("disabled", false).removeClass("disabled");
			this.enabled = true;
		},

		on: function (event, handler) {
			this.eventHandler.on(event, $.proxy(handler, this));
		},

		vote: function (vote) {
			if (this.enabled) {
				console.log(this.id + " votes " + vote);
				this.eventHandler.trigger("vote", [this.id, vote]);
				this.$elem.trigger("vote", [this.id, vote]);
			}
		},

		randomVote: function () {
			var vote = this.config.values[Math.floor(Math.random() * this.config.values.length)];
			this.vote(vote);
		}
	};
})();