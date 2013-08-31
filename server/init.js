module.exports = {
	webInit: webInit,
	webSocketInit: webSocketInit
};

// function to do extra initialization before starting web server
function webInit(site, options) {
	require("./api/app_results").initialize(site, options);
	require("./api/api_handler").initialize(site, options);
}

// function to do extra initialization after listening with websocket
function webSocketInit(site, options) {
	require("./socket/websockets").initialize(site, options);
}