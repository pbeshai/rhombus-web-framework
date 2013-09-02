define([
  "App",
  "framework/modules/Participant",
],

function (App, Participant) {
  var CommonModels = {};

  CommonModels.GroupModel = Backbone.Model.extend({
    url: null,
    partnerUp: true, // if so, will partner people from group1 with those in group2

    // 'participants' is an array of models
    initialize: function (attrs, options) {
      this.options = _.extend({}, {
        forceEven: false
      }, options);

      var participants;

      if (options.fromJSON) {
        // special initialization when deserializing from JSON obj

        var jsonModel = options.jsonModel;
        participants = Participant.Util.collectionFromJSON(jsonModel.participants);

        // convert from JSON object to actual models in the participants collection
        var group1Participants = _.map(jsonModel.group1, function (group1ParticipantAlias) {
          return participants.findByAlias(group1ParticipantAlias);
        });
        this.set("group1", new Participant.Collection(group1Participants));

        // convert from JSON object to actual models in the participants collection
        var group2Participants = _.map(jsonModel.group2, function (group2ParticipantAlias) {
          return participants.findByAlias(group2ParticipantAlias);
        });
        this.set("group2", new Participant.Collection(group2Participants));
      } else {
        // normal initialization

        if (attrs.participants instanceof Backbone.Collection) {
          participants = attrs.participants;
        } else {
          participants = new Participant.Collection(attrs.participants);
        }

        // ensure we have even number of participants by adding a bot
        if (this.options.forceEven && participants.length % 2 === 1) {
          this.addBot(participants);
        }

        this.set("group1", new Participant.Collection());
        this.set("group2", new Participant.Collection());
        this.assignGroups(participants);
      }

      this.set("participants", participants);
      this.on("reset", this.assignGroups);
      this.listenTo(participants, "reset", this.assignGroups);
    },

    toJSON: function () {
      return {
        group1: this.get("group1").pluck("alias"),
        group2: this.get("group2").pluck("alias"),
        participants: this.get("participants").toJSON()
      };
    },


    // can be overridden by subclasses to change type of bot added
    addBot: function (collection) {
      collection.add(new Participant.Bot());
    },

    // put the participants into groups and pair them up (group 1 participants paired with group 2)
    assignGroups: function (collection) {
      var models = (collection !== undefined) ? collection.models : this.get("participants").models;

      var indices = [];
      _.each(models, function (model, i) { indices[i] = i; });
      indices = _.shuffle(indices);

      if (indices.length < 2) {
        console.log("less than two models");
      } else {
        for(var i = 0; i < (indices.length - (indices.length % 2)); i += 2) {
          this.get("group1").add(models[indices[i]]);
          this.get("group2").add(models[indices[i+1]]);

          if (this.partnerUp) {
            models[indices[i]].set("partner", models[indices[i+1]]);
            models[indices[i+1]].set("partner", models[indices[i]]);
          }
        }

        if (indices.length % 2 == 1) {
          console.log("uneven number of models, one model with no partner: " + models[indices[indices.length-1]].get("alias"));
        }
      }
    },
  });
  // deserialize from JSON
  CommonModels.GroupModel.fromJSON = function (jsonModel) {
    var model = new CommonModels.GroupModel(undefined, { fromJSON: true, jsonModel: jsonModel });
    return model;
  };

  CommonModels.Instructions = Backbone.Model.extend({
    initialize: function (attrs, options) {
      attrs = _.defaults(this.attributes, { header: this.header, description: this.description, buttonConfig: this.buttonConfig });
      var instrModel = this;
      // check if the description is a template, in which case, load it
      if (_.isObject(this.description) && this.description.template) {
          attrs.description = ""; // prevents [Object object] from showing up
          new App.BaseView({ template: this.description.template, serialize: options.config }).render().then(function () {
            instrModel.set("description", this.el.innerHTML);
          });
      }

      // easy way to initialize with a config is to subclass and supply a configInit function
      // while passing a config object as an option
      if (_.isFunction(this.configInit)) {
        this.configInit(options.config);
      }
    }
  });

  CommonModels.ConfigureModel = Backbone.Model.extend({
    sync: function () {
      App.controller.appConfig(this.attributes);
      this.changed = {};
    }
  });

  return CommonModels;
});