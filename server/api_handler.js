/** Module for handling API requests */

module.exports = {
	initialize: initialize,
  handle: handle
};

var fs = require('fs')
	, sqlite3 = require('sqlite3').verbose();

var dbFilename = "server/app.db";

function initialize(site) {
	site.all("/api/*", handle);
	site.post("/api/participant", registerParticipant);
	site.get("/api/participant/:action", handleParticipant)

}

function handle(req, res, next) {
	console.log("API Handler: ", req.params);
	next();
}

function registerParticipant(req, res) {
	console.log("saving participant! ", req.body);

	dbCall(function (db) {
		// TODO: probably should be more secure....
		var params = {
			$server_id: req.body.server_id,
			$system_id: req.body.system_id
		};

		db.run("INSERT INTO participants (server_id, system_id) VALUES ($server_id, $system_id)", params,
			function (err) {
				if (err) {
					console.log(err);
					res.send(500);
				} else {
					res.send(200, "");
				}
			});
	});
}

function handleParticipant(req, res, next) {
	console.log("participant handler! ", req.params.action, req.params);
	var action = req.params.action;
	if (action === "list") {
		// list all participants
		dbCall(function (db) {
			db.all("SELECT * FROM participants", function (err, rows) {
				res.send(rows);
			})
		});

	} else {
		res.send(404);
	}
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