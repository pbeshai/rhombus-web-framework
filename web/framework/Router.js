define([
  // Application.
  "framework/App",

  "framework/modules/ParticipantServer",
  "framework/modules/AppController",
  "framework/modules/ViewControls",

  "framework/modules/Participant",
  "framework/modules/Controls",
  "framework/modules/Register",
  "framework/modules/Modes"
],

function (App, ParticipantServer, AppController, ViewControls, Participant,
  Controls, Register, Modes) {

  // Defining the application router, you can attach sub routers here.
  var Router = Backbone.Router.extend({
    initialize: function () {
      window.App = App; // this is useful for debugging on the fly, so I'll leave it.

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

    routes: {
      "": "index",
      ":managerId/controller/debug" : "debugController",
      ":managerId/controller" : "controller",
      ":managerId/viewer/:name": "viewer",
      "register": "register",
      "admin": "admin"
    },

    // selects the mode and connects the websocket
    selectMode: function (options) {
      if (App.controller || App.viewer) {
        console.log("already connected and registered. aborting", arguments);
        return;
      }
      var mode = options.mode,
        managerId = options.managerId || "m1",
        name = options.name,
        hasView = options.hasView;


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
      if (name) {
        screenName += "." + name;
      }
      App.model.set("screenName", screenName);

      var dfd = $.Deferred();

      // get the viewer/controller id
      socket.on("registered", function (data) {
        App.model.set("browserId", data.id);
        console.log("Registered with ID " + data.id);
        var attrs = { id: data.id, socket: socket };
        if (mode === "controller") {

          if (App.controller) { // reconnect to websocket case
            console.log("Already initialized as controller", data, App.controller);
            App.controller.set(attrs); // update ID and socket
          } else {
            App.controller = new Modes.Controller(attrs);
            if (!hasView) { // standalone will handle their own view
              if (options.debug) {
                router.loadDebugControllerView();
              } else {
                router.loadControllerView();
              }
            }
          }
        } else {
          attrs.name = name;
          if (App.viewer) { // reconnect to websocket case
            console.log("Already initialized as viewer", data, App.viewer);
            App.viewer.set(attrs); // update to new ID and socket (and possibly name)
          } else {
            App.viewer = new Modes.Viewer({ id: data.id, socket: socket, name: name });
            router.loadViewerView();
          }
        }
        dfd.resolve();
      });
      return dfd;
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

    admin: function () {
      console.log("[router: admin]");

      App.setTitle("Admin");
      App.setMainView(new Controls.Views.Admin());
    },

    controller: function (managerId) {
      console.log("[router: controller]", managerId);
      App.setTitle("Controls");
      this.selectMode({ mode: "controller", managerId: managerId });
    },

    loadControllerView: function (view) {
      view = view || new Controls.Views.Controls({ participants: this.participants });
      App.layout.setViews({
        "#main-content": view,
        ".server-status": new ParticipantServer.Views.Status({ model: App.controller.participantServer })
      }).render();
    },

    viewer: function (managerId, viewerName) {
      console.log("[router: viewer]", managerId, viewerName);
      // basic hack to quickly allow an instructions view
      if (viewerName === "instructions") {
        App.showOnlyInstructions();
      }
      this.selectMode({ mode: "viewer", managerId: managerId, name: viewerName });
    },

    loadViewerView: function () {
      App.setTitle("Viewer");
      App.layout.setViews({
        "#main-content": new Modes.Views.Viewer(),
        ".server-status": new ParticipantServer.Views.Status({ model: App.model, simple: true })
      }).render();
    },

    debugController: function (managerId) {
      console.log("[router: debug controller]", managerId);
      App.setTitle("Debug Controls");
      this.selectMode({ mode: "controller", managerId: managerId, debug: true });
    },

    loadDebugControllerView: function (view) {
      view = view || new Controls.Views.DebugControls({ participants: this.participants });
      App.layout.setViews({
        "#main-content": view,
        ".server-status": new ParticipantServer.Views.Status({ model: App.controller.participantServer })
      }).render();
    },

    register: function () {
      console.log("[router: register]");

      App.setTitle("Register");
      App.setMainView(new Register.Views.Register({ participants: this.participants }));
    }
  });

  return Router;

});
