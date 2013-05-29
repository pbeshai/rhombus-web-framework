/**
	This data filter converts server IDs (e.g., clicker IDs) to system usernames,
	ensuring the serverID never gets sent to the client.
*/

var _ = require("lodash"), sqlite3 = require("sqlite3");

var dbFilename = "server/app.db";
var db = new sqlite3.Database(dbFilename);



// TODO: problematic because it is asynchronous

// data of form { data: [ {id: xxx, choice: A}, ... ] }
function filter(data, callback) {
	_.each(data.data, function (choiceData) {
		db.get("SELECT alias FROM participants WHERE serverId=?", choiceData.id, function (err, row) {
			if (err) {
				console.log(err);
			} else if (row !== undefined) {
				choiceData.id = row.alias;
			}
			callback(err);
		});
	});
}

module.exports = {
	filter: filter
};