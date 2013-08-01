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
  io.sockets.on('connection', webSocketConnection);
}

// event handler for connection made to web socket
function webSocketConnection(webSocket) {
  console.log("[websocket connected]");
  webSocket.emit("request-register"); // ask the websocket connectee to introduce itself
  webSocket.on("register", function (data) {
    var manager = getManager(data.manager);
    console.log("websocket register", data);
    if (data.type === "controller") {
      console.log("registering new controller");
      manager.setController(new Manager.ControllerWSH(webSocket, manager));
    } else {
      console.log("registering new viewer");
      manager.addViewer(new Manager.ViewerWSH(webSocket, manager));
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