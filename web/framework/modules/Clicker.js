/**

	A simple grid app for displaying choices

*/
define([
	// Application.
	"framework/App",

	"framework/modules/Participant",

	"framework/modules/StateApp/Module"
],

function (App, Participant, StateApp) {
	var debug = false;
	var Clicker = App.module();

	Clicker.Views.Clicker = App.BaseView.extend({
		template: "framework/templates/clicker/clicker",
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
				App.controller.participantServer.submitChoice(this.id, choice);
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

			var participantServer = App.controller.participantServer;
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

	Clicker.Views.Clickers = App.BaseView.extend({
		template: "framework/templates/clicker/clickers",
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
			this.getViews(".clicker-container").each(function (clickerView) {
				clickerView.randomChoice();
			});
		},

		// sends random A or B
		randomVotesAB: function () {
			this.getViews(".clicker-container").each(function (clickerView) {
				clickerView.randomChoice(["A","B"]);
			});
		},

		// sends random C or D
		randomVotesCD: function () {
			this.getViews(".clicker-container").each(function (clickerView) {
				clickerView.randomChoice(["C","D"]);
			});
		},

		// adds in four clickers
		addClickers: function () {
			var numClickersToAdd = 1;
			for (var i = 0; i < numClickersToAdd; i++) {
				var clickerNum = ++extraClickerCount;
				if (clickerNum < 10) clickerNum = "0" + clickerNum;
				this.addClicker("Web" + clickerNum, true);
			}
		}
	});

	return Clicker;
});