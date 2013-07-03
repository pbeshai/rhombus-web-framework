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
	site.all("/api/*", handle);
}

// if we make it here, 404.
function handle(req, res, next) {
	console.log("API Handler: ", req.params);
	res.send(404);
}

function pdResults(req, res) {
	var now = new Date();
	var results = req.body.results;
	var config = req.body.config;
	function z (str) { // add leading zero
		return ("0"+str).slice(-2);
	}
	var formattedDateTime = now.getFullYear()+z(now.getMonth()+1)+z(now.getDate())+"_"+z(now.getHours())+z(now.getMinutes())+z(now.getSeconds());
	var stream = fs.createWriteStream("log/pd/results." + formattedDateTime + ".txt");
	stream.once('open', function(fd) {
		function output (str) {
			console.log(str);
			stream.write(str + "\n");
		}
		output("Prisoner's Dilemma Results");
		output(now.toString());
		if (config.message) {
			output(config.message);
		}
		if (config.scoringMatrix) {
			output("CC," + config.scoringMatrix.CC + ",CD," + config.scoringMatrix.CD);
			output("DC," + config.scoringMatrix.DC + ",DD," + config.scoringMatrix.DD);
		}

	  output("Alias,Choice,Score,PartnerAlias,PartnerChoice,PartnerScore");
	  _.each(results, function (result) {
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