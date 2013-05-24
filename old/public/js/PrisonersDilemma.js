/** Module that supports simply showing clicks

	Requires: jQuery, jQuery SVG, underscore,
						ClickerApp
*/

(function () {
	"use strict"

	// "inherit" from ClickerApp
	window.PrisonersDilemma = Object.spawn(ClickerApp, {
		config: {
			numClickers: 18,
			width: 150,
			height: 150,
			margin: 4,
			rectSettings: {
				stroke: '#ddd',
				strokeWidth: 1,
				fill: '#fafafa',
			},
			idTextSettings: {
				fontFamily: 'helvetica neue',
				fontSize: 12,
				textAnchor: 'middle',
				fill: "#fff",
				class_: 'id-text'
			},
			voteTextSettings: {
				fontFamily: 'helvetica neue',
				fontSize: 20,
				textAnchor: 'middle',
				fill: "#fff",
				class_: 'vote-text'
			},
			colorMap: {
				A: "#03588C",
				B: "#1763A6",
				C: "#419CA6",
				D: "#54BF83",
				E: "#8DBF41",
				stored: "#ccc"
			},
			voteLabels: {
				A: "Silent",
				B: "Talk"
			},

			/*								B
										NoTalk			Talk
					  NoTalk	  A,A 				A,B
					A
			   		Talk 		  B,A  				B,B
			*/
			voteColours: {
				AA: [ "#009900", "#009900" ],
				AB: [ "#990000", "#00cc00" ],
				BA: [ "#00cc00", "#990000" ],
				BB: [ "#cc0000", "#cc0000" ]
			},
			voteScores: {
				AA: [ 5, 5 ],
				AB: [ 3, 10 ],
				BA: [ 10, 3 ],
				BB: [ 0, 0 ]
			}
		},
		$svg: null,
		votes: [], // [ [{user: x, vote: a}, {user: y, vote: b}], ...]

		// builds the svg
		build: function () {
			var svg = $("#canvas-container").svg().svg('get');
			this.$svg = $("#canvas-container > svg");
			var config = this.config;

			var numRects = Math.ceil(config.numClickers / 2);
			var rows = Math.round(Math.sqrt(numRects));
			var columns = Math.ceil(Math.sqrt(numRects));
			var rectHeight = config.height /2;

			for (var i = 0; i < rows; i++) {
				for (var j = 0; j < columns; j++) {
					var count = i*columns + j;
					if(count >= numRects) break;

					var x = config.width*j + config.margin*j;
					var y = config.height*i + config.margin*i;

					createPairDisplay("group-"+count, x, y);
				}
			}

			function createPairDisplay(id, x, y) {
				// <group <group <rect, text, text>> <group <rect, text, text>>>
				var group = svg.group(id, {transform: "translate("+x+","+y+")"});
				var groupA = svg.group(group, id+"-A");
				var groupB = svg.group(group, id+"-B", {transform: "translate(0,"+rectHeight+")"});

				createPersonDisplay(groupA);
				createPersonDisplay(groupB);
			}

			function createPersonDisplay(parent) {

				svg.rect(parent, 0, 0, config.width, rectHeight, config.rectSettings);

				// vote person A
				svg.text(parent, config.width/2, rectHeight/2+config.voteTextSettings.fontSize/2, "", config.voteTextSettings);
				// id person A
				svg.text(parent, config.width/2, config.idTextSettings.fontSize, "", config.idTextSettings);

			}

		},

		findDisplay: function (user) {
			console.log(this, this.$svg);
			return this.$svg.children("g").eq(Math.floor(user.id / 2));
		},

		// handle when a user clicks. user: { id: <0..n-1>, clicker: "174a324" }, vote: [A-E]
		handleClick: function (user, vote) {
			// discard invalid votes
			if (!this.validateVote(vote)) return;

			// find the group, if it doesn't exist, assign one
			var $display = this.findDisplay(user);
			var person = user.id % 2; // 0 = person A, 1 = person B
			var other = (user.id + 1) % 2;

			if ($display.length === 0) { // not enough rects
				console.log("Warning! Could not get display for ", user);
				return;
			} else {
				$display.find("text.id-text").eq(person).text(user.clicker);
			}

			this.storeVote(user, vote);

			if (this.isPairComplete(user)) {
				this.revealVotePair(user);
			} else {
				// clear the text
				$display.find("text.vote-text").eq(person).text("Played").end()
					.eq(other).text("");

				// update the colour of the rect to show something is stored.
  			$display.find("rect").eq(person).attr("fill", this.config.colorMap.stored)
  				.attr("fill-opacity", 1)
  				.end()
  				// make the other rect less opaque
  				.eq(other).attr("fill", "#666");


			}
		},

		// only A and B are valid votes. discard others.
		validateVote: function (vote) {
			return vote === "A" || vote === "B";
		},

		// true if both users have unused votes, false otherwise
		isPairComplete: function (user) {
			var pair = this.findVotePair(user);
			return pair[0] !== null && !pair[0].used && pair[1] !== null && !pair[1].used;
		},

		// finds the pair for this user in the collection
		findVotePair: function (user) {
			var index = Math.floor(user.id / 2);
			if (this.votes[index] === undefined) {
				this.votes[index] = [null, null];
			}
			return this.votes[index];
		},

		storeVote: function (user, vote) {
			var pair = this.findVotePair(user);
			pair[user.id % 2] = { user: user, vote: vote, used: false };
		},

		revealVotePair: function (user) {
			var pair = this.findVotePair(user);
			this.revealVote(pair[0]);
			this.revealVote(pair[1]);

			// colour the votes as per who did better
			var votePair = pair[0].vote+pair[1].vote;
			var colours = this.config.voteColours[votePair];

			var $display = this.findDisplay(user);
			$display.find("rect")
					.eq(0).attr("fill", colours[0]).end()
					.eq(1).attr("fill", colours[1]);

			// update the labels with scores
			var score = this.config.voteScores[votePair];
			$display.find("text.vote-text")
				.eq(0).text(this.config.voteLabels[pair[0].vote] + ": "+score[0]).end()
				.eq(1).text(this.config.voteLabels[pair[1].vote] + ": "+score[1]);
		},

		revealVote: function (storedVote) {
			var user = storedVote.user, vote = storedVote.vote;
			var $display = this.findDisplay(user);
			var person = user.id % 2;
			storedVote.used = true;

			// update the text to be the click
			$display.find("text.vote-text").eq(person).text(this.config.voteLabels[vote]);

			// update the colour of the rect
  		$display.find("rect").eq(person).attr("fill", this.config.colorMap[vote])
  			.attr("fill-opacity", 1);
		}
	});
}());