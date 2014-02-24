define([
  "framework/App",
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

      if (this.options.fromJSON) {
        // special initialization when deserializing from JSON obj

        var jsonModel = this.options.jsonModel;
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

    // restore from a JSON snapshot, different from update in that it clears
    // all non specified attributes and participants
    restore: function (snapshot) {
      this.get("participants").restore(snapshot.participants);
    },

    hasNewParticipants: function () {
      return this.get("participants") && this.get("participants").hasNewParticipants();
    },

    addNewParticipants: function (hasBots, prepare) {
      var groupModel = this;
      if (!groupModel.hasNewParticipants()) {
        return;
      }

      // store the new participants and clear them as we will add them later
      var newParticipants = groupModel.get("participants").clearNewParticipants();

      // handles partnering with each other and shuffling
      var newParticipantsModel = new CommonModels.GroupModel({ participants: newParticipants }, { forceEven: hasBots });

      // if there is an odd number of new participants and there is a bot currently playing, we need to replace it
      if (hasBots && newParticipants.length % 2 === 1) {
        var bot = groupModel.get("participants").find(function (p) { return p.bot; });
        if (bot) { // replace the bot.
          var botPartnerGroup = groupModel.get("group1").contains(bot) ? 2 : 1;

          var newBot = newParticipantsModel.get("participants").find(function (p) { return p.bot; });
          var newBotPartnerGroup = newParticipantsModel.get("group1").contains(newBot) ? 2 : 1;

          var currentBotPartner = bot.get("partner");
          var newBotPartner = newBot.get("partner");
          currentBotPartner.set("partner", newBotPartner);
          newBotPartner.set("partner", currentBotPartner);

          // make sure they are in different groups
          if (newBotPartnerGroup === botPartnerGroup) {
            newParticipantsModel.switchGroups(newBotPartner);
          }

          groupModel.remove(bot);
          newParticipantsModel.remove(newBot);
        }
      }

      // prepare the new participants (sets valid choices and whatever else)
      if (prepare) {
        prepare(newParticipantsModel);
      }

      groupModel.addFromGroupModel(newParticipantsModel);
    },

    // add in elements in a different group model
    addFromGroupModel: function (otherGroupModel) {
      this.get("group1").add(otherGroupModel.get("group1").models);
      this.get("group2").add(otherGroupModel.get("group2").models);
      this.get("participants").add(otherGroupModel.get("participants").models);
    },

    remove: function (model) {
      this.get("participants").remove(model);
      this.get("group1").remove(model);
      this.get("group2").remove(model);
    },

    // can be overridden by subclasses to change type of bot added
    addBot: function (collection) {
      collection.add(new Participant.Bot());
    },

    // move a model from one group to the other
    switchGroups: function (model) {
      var group1 = this.get("group1"), group2 = this.get("group2");
      if (group1.contains(model)) {
        group1.remove(model);
        group2.add(model);
      } else if (group2.contains(model)) {
        group2.remove(model);
        group1.add(model);
      }
    },

    // put the participants into groups and pair them up (group 1 participants paired with group 2)
    assignGroups: function (collection) {
      var models = (collection !== undefined) ? collection.models : this.get("participants").models;

      var indices = _.shuffle(_.range(models.length));

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

    // (re)partners the models in the collection
    partner: function () {
      var group1 = this.get("group1").models, group2 = this.get("group2").models;
      var indices = _.shuffle(_.range(group1.length));

      for (var i = 0; i < indices.length; i++) {
        var model = group1[indices[i]];
        var partner = group2[i];

        model.set("partner", partner);
        partner.set("partner", model);
      }
    }
  });
  // deserialize from JSON
  CommonModels.GroupModel.fromJSON = function (jsonModel) {
    var model = new CommonModels.GroupModel(undefined, { fromJSON: true, jsonModel: jsonModel });
    return model;
  };

  CommonModels.Instructions = Backbone.Model.extend({
    layout: { description: "top" },

    initialize: function (attrs, options) {
      attrs = _.defaults(this.attributes, { header: this.header, description: this.description, buttonConfig: this.buttonConfig, layout: this.layout });
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

  // model for updating complex views
  CommonModels.ViewModel = Backbone.Model.extend({
    sync: function () {
      App.controller.appController.updateView(this.attributes);
      this.changed = {};
    }
  });

  return CommonModels;
});