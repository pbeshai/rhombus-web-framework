// ##################
// WebSocket initialization
// ##################

module.exports = {
	initialize: initialize
};

// Module Dependencies
var Manager = require("./manager");

var runningManagers = {};

function initialize(io) {
	io.sockets.on('connection', webSocketConnection);
}

// event handler for connection made to web socket
function webSocketConnection(webSocket) {
	console.log("[websocket connected]");

	webSocket.on("register", function (data) {
		var manager = getManager(data.manager);
		console.log("websocket register", data);
		var handler;
		var type = data.type;
		if (type === "controller") {
			console.log("registering new controller");
			handler = new Manager.ControllerWSH(webSocket, manager, data.name);
			manager.setController(handler);
		} else if (type === "viewer") {
			type = "viewer";
			console.log("registering new viewer");
			handler = new Manager.ViewerWSH(webSocket, manager, data.name);
			manager.addViewer(handler);
		} else {
			console.log("invalid type to register:", data.type);
		}
	});
}

// creates a new manager if one does not exist, or returns the one that maps to the id
function getManager(id) {
	var manager = runningManagers[id];
	if (manager === undefined) {
		console.log("creating new manager with id ", id);
		manager = runningManagers[id] = new Manager.Manager(id);
	}
	return manager;
}