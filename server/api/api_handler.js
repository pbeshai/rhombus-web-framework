/** Module for handling API requests */

module.exports = {
	initialize: initialize
};

var fs = require('fs')
	, sqlite3 = require('sqlite3').verbose()
	, _ = require('lodash'),
	logger = require("../../../log/logger");

var dbConfig = {
		file: "app.db",
		create: __dirname + "/../sql/create.sql"
};

function initialize(site, initConfig) {
	site.post("/api/participants", registerParticipants);
	site.get("/api/participants", listParticipants);
	site.delete("/api/participants", deleteParticipants);
	site.get("/api/apps", listApps);
	site.all("/api/*", handle);

	initConfig = initConfig || {};
	_.extend(dbConfig, initConfig.database);

	logger.info("api initialized, using dbConfig", { dbConfig: dbConfig });
}

// generates a js file with the dependencies for all applications in app/web/app/apps and the apps provided in framework.
// supports: app/web/app/apps/<dir>/App.js and app/web/app/apps/<dir>/<dir>App.js
function listApps(req, res) {
	var baseDir = "app/web/app/";
	var appsDir = "apps";
	var apps = ["framework/apps/Grid/App"];

	fs.readdir(baseDir + appsDir, function (err, files) {
		console.log(files);
		if (err) {
			console.log(err);
			res.send(500);
			return;
		}
		files.forEach(function (file) {
			var path = baseDir + appsDir + "/" + file;
			var stat = fs.statSync(path);
			if (stat && stat.isDirectory()) {
				// match either App.js or <dirname>App.js (e.g. CoinMatchingApp.js)
				if (fs.existsSync(path + "/App.js")) {
					apps.push(appsDir + "/" + file + "/App");
				} else if (fs.existsSync(path + "/" + file + "App.js")) {
					apps.push(appsDir + "/" + file + "/" +file + "App");
				}
			}
		});

		var dependencies = ["framework/App"].concat(apps);

		res.set("Content-Type", "application/javascript");
		res.send(200, 'define(' + JSON.stringify(dependencies) +
			', function () { ' +
			'var apps = Array.prototype.slice.call(arguments, 1);' +
			'return _.map(apps, function (app) { return app.app; });' +
			' });');
	});
}

// if we make it here, 404.
function handle(req, res, next) {
	logger.info("API Handler: ", {requestParams: req.params});
	res.send(404);
}

function deleteParticipants(req, res) {
	logger.info("deleting all participants");

	dbCall(function (db) {
		db.run("DELETE FROM participants", function (err) {
			if (err) {
				logger.info(err);
				res.send(500);
			} else {
				res.send(200, "");
			}
		});
	});
}

// supports either an array of participants or an object (single participant)
function registerParticipants(req, res) {
	logger.info("saving participants ", { requestBody: req.body });

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
					logger.error(err);
				}
				if (errors.length) {
					logger.error(errors);
				}

				res.send(500);
			} else {
				res.send(200, "");
			}
		});
	});
}

function listParticipants(req, res) {
	// list all participants
	dbCall(function (db) {
		db.all("SELECT * FROM participants", function (err, rows) {
			res.send(rows);
		});
	});
}

function dbCall(callback) {
	fs.exists(dbConfig.file, function (exists) {
		var db = new sqlite3.Database(dbConfig.file);

		if (!exists) {
			logger.warn("this database does not exist");

			fs.readFile(dbConfig.create, "utf8", function (err, data) {
				if (err) throw err;

				db.exec(data, function (err) {
					if (err) throw err;
					logger.info("finished running db create script " + dbConfig.create);
				});

				// db setup
				callback(db);
			});
		} else {
			callback(db);
		}

	});
}