/** Module that supports simply showing clicks

	Requires: jQuery, jQuery SVG, underscore,
						ClickerApp
*/

(function () {
	"use strict"



	// "inherit" from ClickerApp
	window.ClickerInputs = Object.spawn(ClickerApp, {
		config: {
			numClickers: 18,
			values: "ABCDE"
		},

		clickers: [],


		// builds clickers
		build: function () {
			var $main = $("#main"), c;

			// create numClickers clickers
			for (var i = 0; i < this.config.numClickers; i++) {
				c = Object.create(ClickerInput);
				c.init({
					parent: $main,
					/*labels: {
						A: "Junhao",
						B: "Peter",
						C: "Kelly",
						D: "Orkhan",
						E: "Syavash"
					}*/
				});
				c.on("vote", this.submitClick);
				this.clickers.push(c);
			}

			// hook-up random votes button
			$("#random-votes").on("click", $.proxy(this.randomVotes, this));
		},

		randomVotes: function () {
			for (var i = 0; i < this.clickers.length; i++) {
				this.clickers[i].randomVote();
			}
		},

		// handle when a user clicks. user: { id: <0..n-1>, clicker: "174a324" }, click: [A-E]
		handleClick: function (user, click) {
		}
	});
}());