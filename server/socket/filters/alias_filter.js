/**
	This data filter converts server IDs (e.g., clicker IDs) to system usernames,
	ensuring the serverID never gets sent to the client.
*/

var _ = require("lodash")
	, sqlite3 = require("sqlite3")
	, async = require("async");


var AliasFilter = function () {
	this.db = new sqlite3.Database(this.dbFilename);
	setInterval(_.bind(this.updateCache, this), this.cacheTime);
	this.updateCache();
}
_.extend(AliasFilter.prototype, {
	dbFilename: "server/app.db",
	db: null,
	cacheTime: 600000, // update cache every ten minutes
	cache: {},

	// create map from serverId to alias
	updateCache: function () {
		console.log("[alias filter] updating cache");
		var cache = this.cache;
		this.db.all("SELECT alias,serverId FROM participants", function (err, rows) {
			_.each(rows, function (row) {
				cache[row.serverId] = row.alias;
			});
		});
	},

	getAlias: function (choiceData, callback) {
		var cache = this.cache;
		var alias = cache[choiceData.id];
		if (alias === undefined) {
			// get alias from db and store in cache
			this.db.get("SELECT alias FROM participants WHERE serverId=?", choiceData.id, function (err, row) {
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
	},


	// data of form { data: [ {id: xxx, choice: A}, ... ] }
	filter: function (data, outerCallback) {
		async.each(data.data, _.bind(function (choiceData, innerCallback) {
			this.getAlias(choiceData, _.bind(function (alias, err) {
				if (alias != null) {
					choiceData.id = alias;
				}
				innerCallback(err);
			}, this));
		}, this), outerCallback);
	}
});

module.exports = {
	AliasFilter: AliasFilter
};
