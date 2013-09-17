// ##################
// WebSocket initialization
// ##################

module.exports = {
	initialize: initialize
};

// Module Dependencies
var Manager = require("./manager"),
		ClickerServer = require("./participant_servers").ClickerServer,
		logger = require("../../../log/logger");


var runningManagers = {};
var participantServers; // map of configured Participant Servers

function initialize(io, config) {
	logger.info("config is ", { config: config });
	initializeParticipantServers(config);
	io.sockets.on('connection', webSocketConnection);
}

function initializeParticipantServers(config) {
	config = config || {};

	participantServers = {
		"clicker": new ClickerServer(config.participantServer)
	};
}



// event handler for connection made to web socket
function webSocketConnection(webSocket) {
	logger.info("[websocket connected]");

	webSocket.on("register", function (data) {
		var manager = getManager(data.manager);
		logger.info("websocket register", {data: data});
		var handler;
		var type = data.type;
		if (type === "controller") {
			logger.info("registering new controller");
			handler = new Manager.ControllerWSH(webSocket, manager, data.name);
			manager.setController(handler);
		} else if (type === "viewer") {
			type = "viewer";
			logger.info("registering new viewer");
			handler = new Manager.ViewerWSH(webSocket, manager, data.name);
			manager.addViewer(handler);
		} else {
			logger.info("invalid type to register: " + data.type);
		}
	});
}

// creates a new manager if one does not exist, or returns the one that maps to the id
function getManager(id) {
	var manager = runningManagers[id];
	if (manager === undefined) {
		logger.info("creating new manager with id " + id);
		manager = runningManagers[id] = new Manager.Manager(id, participantServers.clicker);
	}
	return manager;
}