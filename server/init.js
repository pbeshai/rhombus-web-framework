module.exports = {
	webInit: webInit,
	webSocketInit: webSocketInit
};

var fs = require("fs");


// function to do extra initialization before starting web server
function webInit(site, options) {
	var userInitDir = "app/", userInitPath = __dirname + "/" + userInitDir;
	if (fs.existsSync(userInitPath)) {
		fs.readdirSync(userInitPath).forEach(function(file) {
			console.log("initializing " + userInitDir + file);
		  require("./" + userInitDir + file).initialize(site, options);
		});
	}

	console.log("initializing api/api_handler.js");
	require("./api/api_handler").initialize(site, options);
}

// function to do extra initialization after listening with websocket
function webSocketInit(io, options) {
	io.set('log level', 1); // reduces logging.
	console.log("initializing websockets")
	require("./socket/websockets").initialize(io, options);
}