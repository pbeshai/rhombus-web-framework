// ##################
// WebSocket initialization
// ##################

module.exports = {
  init: init
};

// Module Dependencies
var Manager = require("./manager");

var runningManagers = {};

function init(io) {
  console.log("initialized web sockets");
  io.set('log level', 1); // reduces logging.. probably shouldn't be set here.
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
      handler = new Manager.ControllerWSH(webSocket, manager);
      manager.setController(handler);
    } else if (type === "viewer") {
      type = "viewer";
      console.log("registering new viewer");
      handler = new Manager.ViewerWSH(webSocket, manager);
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
    manager = runningManagers[id] = new Manager.Manager(id);
  }
  return manager;
}