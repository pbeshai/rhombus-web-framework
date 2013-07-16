/** Module for handling API requests */

module.exports = {
	initialize: initialize,
  handle: handle
};

var fs = require('fs')
	, sqlite3 = require('sqlite3').verbose()
	, _ = require('lodash');

var dbFilename = "server/app.db";

function initialize(site) {

	site.post("/api/participants", registerParticipants);
	site.get("/api/participants", listParticipants)
	site.delete("/api/participants", deleteParticipants);
	site.post("/api/apps/pd/results", pdResults);
	site.post("/api/apps/pdm/results", pdmResults);
	site.post("/api/apps/npd/results", npdResults);
	site.post("/api/apps/teampd/results", teampdResults);
	site.all("/api/*", handle);
}

// if we make it here, 404.
function handle(req, res, next) {
	console.log("API Handler: ", req.params);
	res.send(404);
}

function z (str) { // add leading zero
	return ("0"+str).slice(-2);
}

function filenameFormat(date) {
	return date.getFullYear()+z(date.getMonth()+1)+z(date.getDate())+"_"+z(date.getHours())+z(date.getMinutes())+z(date.getSeconds());
}

function pdResults(req, res) {
	var now = new Date();
	var results = req.body.results;
	var config = req.body.config;
	var version = req.body.version;

	var stream = fs.createWriteStream("log/pd/results." + filenameFormat(now) + ".txt");
	stream.once('open', function(fd) {
		function output (str) {
			console.log(str);
			stream.write(str + "\n");
		}
		output("Prisoner's Dilemma Results (v" + version + ")");
		output(now.toString());
		if (config.message) {
			output(config.message);
		}
		if (config.scoringMatrix) {
			output("CC," + config.scoringMatrix.CC + ",CD," + config.scoringMatrix.CD);
			output("DC," + config.scoringMatrix.DC + ",DD," + config.scoringMatrix.DD);
		}

	  output("Alias,Choice,Payoff,PartnerAlias,PartnerChoice,PartnerPayoff");
	  _.each(results, function (result) {
			output(result.alias + "," + result.choice + "," + result.score + "," + result.partner.alias + "," + result.partner.choice + "," + result.partner.score);
		});
	  stream.end();
	});

	res.send(200);
}

function pdmResults(req, res) {
	var now = new Date();
	var results = req.body.results;
	var config = req.body.config;
	var version = req.body.version;
	var round = req.body.round;

	var stream = fs.createWriteStream("log/pdm/results." + filenameFormat(now) + ".txt");
	stream.once('open', function(fd) {
		function output (str) {
			console.log(str);
			stream.write(str + "\n");
		}
		output("Multiround Prisoner's Dilemma Results (v" + version + ")");
		output(now.toString());

		if (config.message) {
			output(config.message);
		}
		if (config.scoringMatrix) {
			output("CC," + config.scoringMatrix.CC + ",CD," + config.scoringMatrix.CD);
			output("DC," + config.scoringMatrix.DC + ",DD," + config.scoringMatrix.DD);
		}

		output("Round " + round + " of " + config.numRounds + " (range was " + config.minRounds + "-" + config.maxRounds +")");
		var r, header = "Alias,Choice,Payoff,PartnerAlias,PartnerChoice,PartnerPayoff";
		for (r = 1; r < round; r++) {
			header += ",Round" + r + ",Round" + r + "Payoff";
		}
	  output(header);
	  var data, roundData;
	  _.each(results, function (result) {
			data = result.alias + "," + result.choice + "," + result.score + "," + result.partner.alias + "," + result.partner.choice + "," + result.partner.score;

			// output the scores from previous rounds too
			for (r = 1; r < round; r++) {
				roundData = result.history[r - 1];
				data += "," + roundData.pairChoices + "," + roundData.score;
			}
			output(data);
		});
	  stream.end();
	});

	res.send(200);
}

function npdResults(req, res) {
	var now = new Date();
	var results = req.body.results;
	var config = req.body.config;
	var version = req.body.version;
	var payoff = req.body.payoff;
	var N = (payoff !== undefined) ? (parseInt(payoff.numCooperators) + parseInt(payoff.numDefectors)) : 0;

	var stream = fs.createWriteStream("log/npd/results." + filenameFormat(now) + ".txt");
	stream.once('open', function(fd) {
		function output (str) {
			console.log(str);
			stream.write(str + "\n");
		}
		output("N-Person Prisoner's Dilemma Results (v" + version + ")");
		output(now.toString());
		if (config.message) {
			output(config.message);
		}
		if (config.Rratio) {
			output("Rratio," + config.Rratio + ",R,"+ (config.Rratio*(N-1)).toFixed(2));
		}
		if (config.H) {
			output("H," + config.H);
		}

    if (payoff) {
    	output("N," + N);
    	output("Cooperator Payoff," + payoff.cooperatorPayoff + ",# Cooperators," + payoff.numCooperators);
    	output("Defector Payoff," + payoff.defectorPayoff + ",# Defectors," + payoff.numDefectors);
    	output("Total Payoff," + payoff.totalPayoff);
    	output("Max Possible Total Payoff," + payoff.maxPayoff);
    }

	  output("Alias,Choice,Payoff");
	  _.each(results, function (result) {
			output(result.alias + "," + result.choice + "," + result.score);
		});
	  stream.end();
	});

	res.send(200);
}

function teampdResults(req, res) {
	var now = new Date();
	var results = req.body.results;
	var config = req.body.config;
	var version = req.body.version;

	var stream = fs.createWriteStream("log/teampd/results." + filenameFormat(now) + ".txt");
	stream.once('open', function(fd) {
		function output (str) {
			console.log(str);
			stream.write(str + "\n");
		}
		output("Team Prisoner's Dilemma Results (v" + version + ")");
		output(now.toString());
		if (config.message) {
			output(config.message);
		}
		if (config.scoringMatrix) {
			output("CC," + config.scoringMatrix.CC + ",CD," + config.scoringMatrix.CD);
			output("DC," + config.scoringMatrix.DC + ",DD," + config.scoringMatrix.DD);
		}

		output("Team 1 (" + config.team1Name + ") vs. Team 2 (" + config.team2Name + ")");
		output("");

		output("Team 1 (" + config.team1Name + ") Results");
	  output("Alias,Choice,Payoff,PartnerAlias,PartnerChoice,PartnerPayoff");
	  _.each(results.team1, function (result) {
			output(result.alias + "," + result.choice + "," + result.score + "," + result.partner.alias + "," + result.partner.choice + "," + result.partner.score);
		});

	  output("");
		output("Team 2 (" + config.team2Name + ") Results");
	  output("Alias,Choice,Payoff,PartnerAlias,PartnerChoice,PartnerPayoff");
	  _.each(results.team2, function (result) {
			output(result.alias + "," + result.choice + "," + result.score + "," + result.partner.alias + "," + result.partner.choice + "," + result.partner.score);
		});
	  stream.end();
	});

	res.send(200);
}

function deleteParticipants(req, res) {
	console.log("deleting all participants");

	dbCall(function (db) {
		db.run("DELETE FROM participants", function (err) {
			if (err) {
				console.log(err);
				res.send(500);
			} else {
				res.send(200, "");
			}
		});
	});
}

// supports either an array of participants or an object (single participant)
function registerParticipants(req, res) {
	console.log("saving participants!", req.body);

	if (req.body == null) return;

	var participants = _.isArray(req.body) ? req.body : [req.body];

	dbCall(function (db) {
		var statement = db.prepare("INSERT INTO participants (alias, name, picture) VALUES ($alias, $name, $picture)");
		var errors = [];
		_.each(participants, function (participant) {
			// TODO: probably should be more secure....
			var params = {
				$alias: participant.alias,
				$name: participant.name,
				$picture: null // TODO: photo support
			};
			statement.run(params, function (err) {
				if (err) {
					errors.push(err);
				}
			});
		});

		// send response after all participants have been added
		statement.finalize(function (err) {
			if (err || errors.length) {
				if (err) {
					console.log(err);
				}
				if (errors.length) {
					console.log(errors);
				}

				res.send(500);
			} else {
				res.send(200, "");
			}
		});
	});
}

function listParticipants(req, res) {
	console.log("participant list!");
	// list all participants
	dbCall(function (db) {
		db.all("SELECT * FROM participants", function (err, rows) {
			res.send(rows);
		})
	});
}

function dbCall(callback) {
	fs.exists(dbFilename, function (exists) {
		var db = new sqlite3.Database(dbFilename);

		if (!exists) {
			console.log("this database does not exist");
			fs.readFile("server/sql/create.sql", "utf8", function (err, data) {
				if (err) throw err;

				db.exec(data, function (err) {
					if (err) throw err;
					console.log("finished running sql/create.sql");
				});

				// db setup
				callback(db);
			});
		} else {
			callback(db);
		}

	});
}