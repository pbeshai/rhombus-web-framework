/** Module for handling API requests */

module.exports = {
	initialize: initialize
};

var fs = require('fs'),
	sqlite3 = require('sqlite3').verbose(),
	_ = require('lodash'),
	logger = require("../../../log/logger");

var dbConfig = {
		file: "app.db",
		create: __dirname + "/../sql/create.sql"
};

function initialize(site, initConfig) {
	initApps(site, initConfig); // initialize api for individual apps by reading server/api.js files

	site.post("/api/participants", registerParticipants);
	site.get("/api/participants", listParticipants);
	site.delete("/api/participants", deleteParticipants);
	site.get("/api/apps", listApps);
	site.get("/api/app_styles", appStyles);
	site.all("/api/*", handle);

	initConfig = initConfig || {};
	_.extend(dbConfig, initConfig.database);

	logger.info("api initialized, using dbConfig", { dbConfig: dbConfig });
}



// go through all the user's app directories, look for the server subfolder and run the api file in there.
function initApps(site, initConfig) {
	var appsDir = "app/web/app/apps";

	var files = fs.readdirSync(appsDir); // must be done synchronously to prevent site.all("/api/*") taking over

	files.forEach(function (file) {
		var apijsPath = appsDir + "/" + file + "/server/api.js";
		if (fs.existsSync(apijsPath)) { // api js exists
			logger.info("Initializing " + file + " API from " + apijsPath + " ...");
			require("../../../" + apijsPath).init(site, initConfig); // require needs path relative to this file
		}
	});
}

// generates a js file with the dependencies for all applications in app/web/app/apps and the apps provided in framework.
// supports: app/web/app/apps/<dir>/App.js and app/web/app/apps/<dir>/<dir>App.js
function listApps(req, res) {
	var baseDir = "app/web/app/";
	var appsDir = "apps";
	var apps = ["framework/apps/Grid/App"];

	fs.readdir(baseDir + appsDir, function (err, files) {
		if (err) {
			logger.error(err);
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

// function to import all index.styl and index.css from apps/APP/style/ directories
// should be linked as css in an index.html
function appStyles(req, res) {
	var baseDir = "app/web/app/";
	var appsDir = "apps";
	var styles = [];

	fs.readdir(baseDir + appsDir, function (err, files) {
		if (err) {
			logger.error(err);
			res.send(500);
			return;
		}
		files.forEach(function (file) {
			var path = baseDir + appsDir + "/" + file;
			var stat = fs.statSync(path);
			if (stat && stat.isDirectory()) {
				// match either index.styl or index.css, defaulting to index.styl if both
				if (fs.existsSync(path + "/styles/index.styl")) {
					styles.push(appsDir + "/" + file + "/styles/index.styl");
				} else if (fs.existsSync(path + "/styles/index.css")) {
					styles.push(appsDir + "/" + file + "/styles/index.css");
				}
			}
		});


		var cssString = styles.map(function (style) {
			return '@import "/app/' + style + '";';
		}).join("\n");

		res.set("Content-Type", "text/css");
		res.send(200, cssString);
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