/**
	This data filter converts server IDs (e.g., clicker IDs) to system usernames,
	ensuring the serverID never gets sent to the client.
*/

var _ = require("lodash")
	, sqlite3 = require("sqlite3")
	, async = require("async");

var dbFilename = "server/app.db";
var db = new sqlite3.Database(dbFilename);

var cache = {};

setInterval(updateCache, 600000); // update cache every ten minutes
updateCache();

// create map from serverId to alias
// TODO: not sure if this is a bad idea, storing all entries in this object.
function updateCache() {
	console.log("[alias filter] updating cache");
	db.all("SELECT alias,serverId FROM participants", function (err, rows) {
		_.each(rows, function (row) {
			cache[row.serverId] = row.alias;
		});
	});
}

function getAlias(choiceData, callback) {
	var alias = cache[choiceData.id];
	if (alias === undefined) {
		// get alias from db and store in cache
		db.get("SELECT alias FROM participants WHERE serverId=?", choiceData.id, function (err, row) {
				if (err) {
					console.log(err);
				} else if (row !== undefined) {
					cache[choiceData.id] = row.alias;
				} else {
					cache[choiceData.id] = null; // it isn't in the database
				}
				callback(alias, err);
		});
	} else {
		callback(alias);
	}
}


// data of form { data: [ {id: xxx, choice: A}, ... ] }
function filter(data, outerCallback) {
	async.each(data.data, function (choiceData, innerCallback) {
		// TODO this should be async.each
		getAlias(choiceData, function (alias, err) {
			if (alias != null) {
				choiceData.id = alias;
			}
			innerCallback(err);
		});
	}, outerCallback);
}

module.exports = {
	filter: filter
};