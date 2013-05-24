/** Module that supports simply showing clicks

	Requires: jQuery, jQuery SVG, underscore,
						ClickerApp
*/

(function () {
	"use strict"

	// "inherit" from ClickerApp
	window.ClickerDisplay = Object.spawn(ClickerApp, {
		config: {
			numClickers: 16,
			width: 100,
			height: 100,
			margin: 4,
			rectSettings: {
				stroke: '#ddd',
				strokeWidth: 1,
				fill: '#fafafa',
			},
			clickerIdTextSettings: {
				fontFamily: 'helvetica neue',
				fontSize: 12,
				textAnchor: 'middle',
				fill: "#fff",
				class_: 'clicker-text'
			},
			clickTextSettings: {
				fontFamily: 'helvetica neue',
				fontSize: 20,
				textAnchor: 'middle',
				fill: "#fff",
				class_: 'click-text'
			},
			colorMap: {
				A: "#03588C",
				B: "#1763A6",
				C: "#419CA6",
				D: "#54BF83",
				E: "#8DBF41"
			}
		},


		// builds the svg
		build: function () {
			var svg = $("#canvas-container").svg().svg('get');
			var config = this.config;

			var numRects = config.numClickers;
			var rows = Math.round(Math.sqrt(numRects));
			var columns = Math.ceil(Math.sqrt(numRects));

			for (var i = 0; i < rows; i++) {
				for (var j = 0; j < columns; j++) {
					var count = i*columns + j;
					if(count >= numRects) break;

					var x = config.width*j + config.margin*j;
					var y = config.height*i + config.margin*i;

					// all groups are initially unassigned
					var group = svg.group("group-"+count, {transform: "translate("+x+","+y+")"});

					svg.rect(group, 0, 0, config.width, config.height, config.rectSettings);
					svg.text(group, config.width/2, config.height/2+config.clickTextSettings.fontSize/2, "", config.clickTextSettings);
					svg.text(group, config.width/2, config.clickerIdTextSettings.fontSize, "", config.clickerIdTextSettings);
				}
			}
		},

		// handle when a user clicks. user: { id: <0..n-1>, clicker: "174a324" }, click: [A-E]
		handleClick: function (user, click) {
			// find the group, if it doesn't exist, assign one
			var $group = $("g").eq(user.id);

			if ($group.length === 0) { // not enough rects
				console.log("Warning! More clicker IDs than clicker spots! "+id+ " has no spot");
				return;
			} else {
				$group.find("text.clicker-text").text(user.clicker);
			}

			// update the text to be the click
			$group.find("text.click-text").text(click);

			// update the colour of the rect
  		$group.find("rect").attr("fill", this.config.colorMap[click]);
		}
	});
}());