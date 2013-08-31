/**

	A simple grid app for displaying choices

*/
define([
	// Application.
	"app",

	"modules/Participant",

	"apps/StateApp"
],

function(app, Participant, StateApp) {
	var debug = false;
	var Clicker = app.module();

	// TODO: clean this up

	Clicker.Views.Clicker = Backbone.View.extend({
		template: "clicker/clicker",
		tagName: "div",
		className: "clicker",

		events: {
			"click .clicker-btn" : "buttonClick"
		},
		enabled: false,
		id: null,
		buttons: ["A","B","C","D","E"],

		serialize: function () {
			return {
				id: this.options.id,
				buttons: this.buttons,
				labels: this.options.labels
			};
		},

		afterRender: function () {
			if (!this.enabled) { // make buttons disabled
				this.disable();
			}
		},

		buttonClick: function (event) {
			var button = event.target;
			this.choose(button.innerHTML);
		},

		// disables the buttons
		disable: function () {
			this.$("button").prop("disabled", true).addClass("disabled");
			this.enabled = false;
		},

		// enables the buttons
		enable: function () {
			this.$("button").prop("disabled", false).removeClass("disabled");
			this.enabled = true;
		},

		choose: function (choice) {
			if (this.enabled) {
				if (debug) { console.log(this.id + " chooses " + choice); }
				app.controller.participantServer.submitChoice(this.id, choice);
			}
		},

		randomChoice: function (buttons) {
			buttons = buttons || this.buttons;
			var choice = buttons[Math.floor(Math.random() * buttons.length)];
			this.choose(choice);
		},

		initialize: function (options) {
			if (this.options) {
				this.id = this.options.id;
				if (this.options.buttons) {
					this.buttons = this.options.buttons;
				}
			}

			var participantServer = app.controller.participantServer;
			// disable when clicks are disabled
			participantServer.on("enable-choices", $.proxy(function (success) {
				if (success) {
					this.enable();
				}
			}, this));
			participantServer.on("disable-choices", $.proxy(function (success) {
				if (success) {
					this.disable();
				}
			}, this));

			participantServer.on("status", $.proxy(function (state) {
				if (state.acceptingChoices) {
					this.enable();
				} else {
					this.disable();
				}
			}, this));

			participantServer.on("disconnect", $.proxy(this.disable, this));
			this.enabled = participantServer.get("connected") && participantServer.get("acceptingChoices");
		}
	});

	// TODO: add in random votes button.
	Clicker.Views.Clickers = Backbone.View.extend({
		template: "clicker/clickers",
		events: {
			"click .random-votes" : "randomVotes",
			"click .random-votes-ab" : "randomVotesAB",
			"click .random-votes-cd" : "randomVotesCD",
			"click .add-clickers" : "addClickers",
		},

		addClicker: function (id, render) {
			var view = new Clicker.Views.Clicker({ id: id });
			this.insertView(".clicker-container", view);

			if (render) {
				view.render();
			}
		},

		beforeRender: function () {
			extraClickerCount = 0;
			this.collection.each(function (participant) {
				this.addClicker(participant.get("alias"));
			}, this);
		},

		initialize: function () {
			this.listenTo(this.collection, {
				"reset": this.render
			});
		},

		randomVotes: function () {
			this.getViews(".clicker-container").each(function(clickerView) {
				clickerView.randomChoice();
			});
		},

		// sends random A or B
		randomVotesAB: function () {
			this.getViews(".clicker-container").each(function(clickerView) {
				clickerView.randomChoice(["A","B"]);
			});
		},

		// sends random C or D
		randomVotesCD: function () {
			this.getViews(".clicker-container").each(function(clickerView) {
				clickerView.randomChoice(["C","D"]);
			});
		},

		// adds in four clickers
		addClickers: function () {
			for (var i = 0; i < 4; i++) {
				this.addClicker("Web" + (++extraClickerCount), true);
			}

		}


	});

	return Clicker;
});