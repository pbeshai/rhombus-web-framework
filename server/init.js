module.exports = {
	webInit: webInit,
	webSocketInit: webSocketInit
};

var fs = require("fs");


// function to do extra initialization before starting web server
function webInit(site, serverOptions, config) {
	console.log("initializing api_handler");
	require("./api/api_handler").initialize(site, config);
}

// function to do extra initialization after listening with websocket
function webSocketInit(io, serverOptions, config) {
	console.log("initializing websockets");
	require("./socket/websockets").initialize(io, config);
}