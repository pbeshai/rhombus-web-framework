module.exports = {
	webInit: webInit,
	webSocketInit: webSocketInit
};

var fs = require("fs");


// function to do extra initialization before starting web server
function webInit(site, options) {
	console.log("initializing api_handler");
	require("./api/api_handler").initialize(site, options);
}

// function to do extra initialization after listening with websocket
function webSocketInit(io, options) {
	console.log("initializing websockets");
	require("./socket/websockets").initialize(io, options);
}