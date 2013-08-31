define([
  // Application.
  "app",

  "modules/Sandbox", // for testing

  "modules/ParticipantServer",
  "modules/AppController",
  "modules/ViewControls",

  "modules/Participant",
  "modules/Grid",
  "modules/Controls",
  "modules/Register",
  "modules/Attendance",
  "modules/Clicker",
  "modules/Modes",
  "apps/Apps",
],

function(app, Sandbox, ParticipantServer, AppController, ViewControls, Participant, Grid, Controls, Register, Attendance,
  Clicker, Modes, Apps) {

  // Defining the application router, you can attach sub routers here.
  var Router = Backbone.Router.extend({
    initialize: function() {
      console.log("TODO REMOVE THIS - app in window (top of router.js)");
      window.app = app;

      var collections = {
        // Set up the users.
        participants: new Participant.Collection(),
      };

      // Ensure the router has references to the collections.
      _.extend(this, collections);

      // Use main layout and set Views.
      app.useLayout("main-layout").setViews({
        ".view-controls": new ViewControls.Views.Controls(),
      });
    },

    apps: Apps.apps,

    routes: {
      "": "index",
      ":managerId/controller" : "controller",
      ":managerId/viewer/:name": "viewer",
      "register": "register",
      "sandbox": "sandbox",

    },

    // selects the mode and connects the websocket
    selectMode: function (mode, managerId, name) {
      if (app.controller || app.viewer) {
        console.log("already connected and registered. aborting", arguments);
        return;
      }

      // need to force new connection in case we have connected and disconnected before
      // (e.g., back button took us back to index and now we choose again)
      var socket = window.io.connect(app.socketUrl, { "force new connection": true });

      // register the viewer/controller
      socket.on("connect", function () {
        socket.emit("register", { type: mode, manager: managerId, name: name });
      });

      var router = this;

      // set the screen name
      var screenName = managerId + "." + mode;
      if (name) screenName += "." + name;
      app.model.set("screenName", screenName);

      // get the viewer/controller id
      socket.on("registered", function (data) {
        app.model.set("browserId", data.id);
        console.log("Registered with ID " + data.id);

        if (mode === "controller") {
          app.controller = new Modes.Controller({ id: data.id, socket: socket });
          router.loadControllerView();
        } else {
          app.viewer = new Modes.Viewer({ id: data.id, socket: socket, name: name });
          router.loadViewerView();
        }
      });
    },

    reset: function () {
      // reset everything
      if (app.viewer) {
        app.viewer.get("socket").disconnect();
        delete app.viewer;
      }
      if (app.controller) {
        app.controller.get("socket").disconnect();
        delete app.controller;
      }
      app.model.set({ browserId: "", screenName: "" });
    },

    index: function () {
      console.log("[router: index]");

      this.reset();

      app.setMainView(new Modes.Views.Selector({ model: app.model }));
    },

    controller: function (managerId) {
      console.log("[router: controls]", managerId);
      this.selectMode("controller", managerId);
    },

    loadControllerView: function () {
      app.setTitle("Controls");
      app.layout.setViews({
        "#main-content": new Controls.Views.Controls({ participants: this.participants }),
        ".server-status": new ParticipantServer.Views.Status({ model: app.controller.participantServer})
      }).render();
    },

    viewer: function (managerId, viewerName) {
      console.log("[router: viewer]", managerId, viewerName);
      this.selectMode("viewer", managerId, viewerName);
    },

    loadViewerView: function () {
      app.setTitle("Viewer");
      app.setMainView(new Modes.Views.Viewer());
    },

    register: function () {
      console.log("[router: register]");

      app.setTitle("Register");
      app.setMainView(new Register.Views.Register({ participants: this.participants }));
    },

    sandbox: function () {
      console.log("[router: sandbox]");

      app.setTitle("Sandbox");
      app.setMainView(new Sandbox.Views.Sandbox());
    }
  });

  return Router;

});
