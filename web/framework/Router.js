define([
  // Application.
  "App",

  "framework/modules/ParticipantServer",
  "framework/modules/AppController",
  "framework/modules/ViewControls",

  "framework/modules/Participant",
  "framework/modules/Controls",
  "framework/modules/Register",
  "framework/modules/Modes",
  "framework/apps/Apps",
],

function (App, ParticipantServer, AppController, ViewControls, Participant,
  Controls, Register, Modes, Apps) {

  // Defining the application router, you can attach sub routers here.
  var Router = Backbone.Router.extend({
    initialize: function () {
      console.log("TODO REMOVE THIS - App in window (top of Router.js)");
      window.App = App;

      var collections = {
        // Set up the users.
        participants: new Participant.Collection(),
      };

      // Ensure the router has references to the collections.
      _.extend(this, collections);

      // Use main layout and set Views.
      App.useLayout("main-layout").setViews({
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
      if (App.controller || App.viewer) {
        console.log("already connected and registered. aborting", arguments);
        return;
      }

      // need to force new connection in case we have connected and disconnected before
      // (e.g., back button took us back to index and now we choose again)
      var socket = window.io.connect(App.socketUrl, { "force new connection": true });

      // register the viewer/controller
      socket.on("connect", function () {
        socket.emit("register", { type: mode, manager: managerId, name: name });
      });

      var router = this;

      // set the screen name
      var screenName = managerId + "." + mode;
      if (name) screenName += "." + name;
      App.model.set("screenName", screenName);

      // get the viewer/controller id
      socket.on("registered", function (data) {
        App.model.set("browserId", data.id);
        console.log("Registered with ID " + data.id);

        if (mode === "controller") {
          App.controller = new Modes.Controller({ id: data.id, socket: socket });
          router.loadControllerView();
        } else {
          App.viewer = new Modes.Viewer({ id: data.id, socket: socket, name: name });
          router.loadViewerView();
        }
      });
    },

    reset: function () {
      // reset everything
      if (App.viewer) {
        App.viewer.get("socket").disconnect();
        delete App.viewer;
      }
      if (App.controller) {
        App.controller.get("socket").disconnect();
        delete App.controller;
      }
      App.model.set({ browserId: "", screenName: "" });
    },

    index: function () {
      console.log("[router: index]");

      this.reset();

      App.setMainView(new Modes.Views.Selector({ model: App.model }));
    },

    controller: function (managerId) {
      console.log("[router: controls]", managerId);
      this.selectMode("controller", managerId);
    },

    loadControllerView: function () {
      App.setTitle("Controls");
      App.layout.setViews({
        "#main-content": new Controls.Views.Controls({ participants: this.participants }),
        ".server-status": new ParticipantServer.Views.Status({ model: App.controller.participantServer})
      }).render();
    },

    viewer: function (managerId, viewerName) {
      console.log("[router: viewer]", managerId, viewerName);
      this.selectMode("viewer", managerId, viewerName);
    },

    loadViewerView: function () {
      App.setTitle("Viewer");
      App.setMainView(new Modes.Views.Viewer());
    },

    register: function () {
      console.log("[router: register]");

      App.setTitle("Register");
      App.setMainView(new Register.Views.Register({ participants: this.participants }));
    }
  });

  return Router;

});
