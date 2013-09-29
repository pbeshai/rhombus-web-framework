define([
  "framework/App",
  "framework/modules/Participant",
  "framework/modules/common/CommonModels",

  "framework/modules/StateApp/Module",
],
function (App, Participant, CommonModels, StateApp) {
  var CommonStates = {};

  /***** NON-VIEW STATES *********************************************************************/

  // add a bot if necessary
  CommonStates.BotCheck = StateApp.State.extend({
    name: "botcheck",
    rules: {
      "at-least-two": function (participants) { return participants.length === 1; },
      "even": function (participants) { return (participants.length % 2) === 1; },
    },

    defaults: {
      activeRules: [ "at-least-two", "even" ],
    },

    run: function () {
      // clear all bots that are currently there. this was when going through here on prev it removes bots
      this.input.participants.remove(this.input.participants.filter(function (p) { return p.bot; }));
    },

    // add bot on exit, so it only happens when going to next state, not back to prev
    onExit: function () {
      var participants = this.input.participants;

      var botsRequired = _.some(this.options.activeRules, function (rule) {
        var result = this.rules[rule](participants);
        return result;
      }, this);

      if (botsRequired) {
        participants.addBot();
      }
    }
  });

  // partner participants
  CommonStates.Partner = StateApp.State.extend({
    name: "partner",
    defaults: {
      symmetric: true,
    },

    // assign partners on exit, so it only happens when going to next state, not back to prev
    onExit: function () {
      var participants = this.input.participants;

      if (this.options.symmetric) {
        participants.pairModels();
      } else {
        participants.pairModelsAsymmetric();
      }
    }
  });

  // partner participants in a GroupModel
  CommonStates.GroupPartner = StateApp.State.extend({
    name: "partner",

    // assign partners on exit, so it only happens when going to next state, not back to prev
    onExit: function () {
      var groupModel = this.input.groupModel;

      groupModel.partner();
    }
  });

  // form groups out of the participants (default partners them across teams as well)
  CommonStates.Group = StateApp.State.extend({
    name: "group",
    groupModelOptions: {
      partnerUp: true
    },

    // assign groups on exit, so it only happens when going to next state, not back to prev
    onExit: function () {
      if (this.input.groupModel) { // already grouped; do nothing
        return;
      }

      var groupModel = new CommonModels.GroupModel({ participants: this.input.participants }, this.groupModelOptions);

      return new StateApp.StateMessage({ groupModel: groupModel });
    }
  });

  // score participants
  CommonStates.Score = StateApp.State.extend({
    name: "score",
    assignScore: function (participant) { // template method
      participant.set("score", -94);
    },

    assignScores: function (participants) {
      participants.each(this.assignScore, this);
    },

    // assign scores on exit, so it only happens when going to next state, not back to prev
    onExit: function () {
      var participants = this.input.participants;

      this.assignScores(participants);
    }
  });

  // score participants
  CommonStates.GroupScore = StateApp.State.extend({
    name: "score",
    assignScore: function (participant) { // template method
      participant.set("score", -94);
    },

    assignScoreGroup1: function (participant) {
      this.assignScore(participant);
    },

    assignScoreGroup2: function (participant) {
      this.assignScore(participant);
    },

    assignScoresGroup1: function (group1) {
      group1.each(this.assignScoreGroup1, this);
    },

    assignScoresGroup2: function (group2) {
      group2.each(this.assignScoreGroup2, this);
    },

    assignScores: function (groupModel) {
      this.assignScoresGroup1(groupModel.get("group1"));
      this.assignScoresGroup2(groupModel.get("group2"));
    },

    // assign scores on exit, so it only happens when going to next state, not back to prev
    onExit: function () {
      this.groupModel = this.input.groupModel;
      this.assignScores(this.groupModel);
    }
  });


  CommonStates.Stats = StateApp.State.extend({
    name: "stats",
    onExit: function () {
      var stats = this.calculateStats(this.input.participants);
      return this.input.clone({ stats: stats });
    },

    calculateStats: function (participants) {
      return {
        average: this.average(participants, "score")
      };
    },

    group: function (participants, attribute) {
      var groups;

      if (participants instanceof Backbone.Collection) {
        groups = participants.groupBy(attribute);
      } else { // assume array
        groups = _.groupBy(participants, function (participant) {
          if (participant instanceof Backbone.Model) {
            return participant.get(attribute);
          } else {
            return participant[attribute];
          }
        });
      }

      return groups;
    },

    count: function (participants) {
      if (participants == null) return 0;

      return participants.length;
    },

    average: function (participants, attribute) {
      if (participants == null || participants.length === 0) return 0; // avoid division by 0

      if (participants instanceof Backbone.Collection) {
        return participants.reduce(function (memo, participant) {
          return memo + participant.get(attribute);
        }, 0) / participants.length;

      } else { // assume it's an array
        return _.reduce(participants, function (memo, participant) {
          if (participant instanceof Backbone.Model) {
            return memo + participant.get(attribute);
          }
          return memo + participant[attribute];
        }, 0) / participants.length;

      }
    }
  });

  CommonStates.GroupStats = CommonStates.Stats.extend({
    name: "stats",
    onExit: function () {
      var overallStats = this.calculateStats(this.input.groupModel.get("participants"));
      var group1Stats = this.calculateStats(this.input.groupModel.get("group1"));
      var group2Stats = this.calculateStats(this.input.groupModel.get("group2"));

      return result.clone({ stats: { overall: overallStats, group1: group1Stats, group2: group2Stats } });
    },
  });


  // buckets participants
  CommonStates.Bucket = StateApp.State.extend({
    name: "bucket",
    bucketAttribute: "score",
    numBuckets: 6,

    initialize: function () {
      StateApp.State.prototype.initialize.apply(this, arguments);
      this.name = this.name + ":" + this.bucketAttribute;
    },

    // assign buckets on exit, so it only happens when going to next state, not back to prev
    onExit: function () {
      var participants = this.input.participants;
      if (this.input.groupModel) {
        participants = this.input.groupModel.get("participants");
      }

      participants.bucket(this.bucketAttribute, this.numBuckets);
    }
  });


  /***** VIEW STATES *************************************************************************/

  CommonStates.Play = StateApp.ViewState.extend({
    name: "play",
    defaultChoice: "A", // choice made when a player does not play

    prepareParticipant: function (participant) {
      console.log("preparing participant", participant.get("alias"));
      participant.reset();
      console.log(participant.get("played"));
      if (this.validChoices) {
        participant.set("validChoices", this.validChoices);
      }

      if (participant.bot) {
        participant.delayedPlay();
      }
    },

    // this.input is a participant participants.
    beforeRender: function () {
      var participants = this.participants = this.input.participants;

      // listen for setting play
      this.stopListening();
      this.listenTo(participants, "change:choice update:choice add", function (participant, choice) {
        participant.set("played", participant.get("choice") != null);
      });

      // reset played and choices
      participants.each(this.prepareParticipant, this);
    },

    viewOptions: function () {
      return {
        participants: this.participants,
        config: this.config
      };
    },

    // outputs a participant participants
    onExit: function () {
      // if you haven't played, then you played the default choice.
      this.participants.each(function (participant) {
        if (participant.get("choice") == null && this.defaultChoice) {
          participant.set("choice", this.defaultChoice);
        }
      }, this);

      return new StateApp.StateMessage({ participants: this.participants });
    },

    addNewParticipants: function (render) {
      // default to with bots, with partners
      this.addNewParticipantsHelper(render, true, true);
    },

    addNewParticipantsHelper: function (render, hasBots, pairModels) {
      var participants = this.input.participants;
      if (!participants.hasNewParticipants()) {
        return;
      }

      if (pairModels === "asymmetric") {
        // TODO: this is problematic to do without breaking the current partnering.
        console.log("Asymmetric pairing on new participants not currently supported.");
        return;
      }

      // store the new participants and clear them as we will add them later
      var newParticipants = participants.clearNewParticipants();
      var replacedBot = false;
      // if there is an odd number of new participants and there is a bot currently playing, we need to replace it
      if (hasBots && newParticipants.length % 2 === 1) {
        var bot = participants.find(function (p) { return p.bot; });
        if (bot) { // adding odd new to odd existing: replace the bot.
          var botPartner = bot.get("partner");
          var newPartner = newParticipants[0];
          botPartner.set("partner", newPartner);
          newPartner.set("partner", botPartner);

          participants.remove(bot);
          replacedBot = true;
          console.log("bot replaced");
        } else {
          // adding odd new to even existing: need a new bot.
          newParticipants.push(new Participant.Bot());
        }
      }

      if (pairModels === true) {
        if (replacedBot) { // do not include the first one since it was partnered with a bot
          console.log("partnering without first");
          participants.pairModels(newParticipants.slice(1));
        } else {
          console.log("partnering");
          participants.pairModels(newParticipants);
        }
      }

      // prepare the new participants (sets valid choices and whatever else)
      _.each(newParticipants, this.prepareParticipant, this);

      participants.add(newParticipants);

      if (render) {
        this.rerender();
      }
    }
  });

  CommonStates.GroupPlay = StateApp.ViewState.extend({
    name: "play",
    defaultChoice: "A",

    initialize: function () {
      StateApp.ViewState.prototype.initialize.call(this);
      if (_.isArray(this.validChoices)) {
        this.validChoices = { group1: this.validChoices, group2: this.validChoices };
      }
    },

    prepareParticipant: function (participant, group) {
      participant.reset();

      if (this.validChoices) {
        participant.set("validChoices", this.validChoices[group]);
      }

      if (participant.bot) {
        participant.delayedPlay();
      }
    },

    prepareParticipantGroup1: function (participant) {
      this.prepareParticipant(participant, "group1");
    },

    prepareParticipantGroup2: function (participant) {
      this.prepareParticipant(participant, "group2");
    },

    beforeRenderGroup1: function (group1) {
      group1.each(this.prepareParticipantGroup1, this);
    },

    beforeRenderGroup2: function (group2) {
      group2.each(this.prepareParticipantGroup2, this);
    },

    beforeRender: function () {
      this.groupModel = this.input.groupModel; // input must be a group model

      // listen for setting play
      this.stopListening();
      this.listenTo(this.groupModel.get("participants"), "change:choice", function (participant, choice) {
        participant.set("played", choice != null);
      });

      this.beforeRenderGroup1(this.groupModel.get("group1"));
      this.beforeRenderGroup2(this.groupModel.get("group2"));
    },

    viewOptions: function () {
      return {
        model: this.groupModel,
        group1Name: this.config.group1Name,
        group2Name: this.config.group2Name,
        group1NameSuffix: this.config.group1NameSuffix,
        group2NameSuffix: this.config.group2NameSuffix,
        config: this.config
      };
    },

    prepareParticipantOutput: function (participant) {
      // set the default choice if configured and the participant hasn't played
      if (participant.get("choice") == null && this.defaultChoice) {
        participant.set("choice", this.defaultChoice);
      }
    },

    prepareParticipantOutputGroup1: function (participant) {
      this.prepareParticipantOutput(participant);
    },

    prepareParticipantOutputGroup2: function (participant) {
      this.prepareParticipantOutput(participant);
    },

    prepareOutputGroup1: function () {
      this.groupModel.get("group1").each(this.prepareParticipantOutputGroup1, this);
    },

    prepareOutputGroup2: function () {
      this.groupModel.get("group2").each(this.prepareParticipantOutputGroup2, this);
    },

    handleConfigure: function () {
      App.controller.appController.updateView({ config: this.config }, "Viewer1"); // TODO: "Viewer1"
    },

    // outputs a GroupModel
    onExit: function () {
      this.prepareOutputGroup1();
      this.prepareOutputGroup2();

      return new StateApp.StateMessage({ groupModel: this.groupModel });
    },

    addNewParticipants: function (render) {
      this.addNewParticipantsHelper(render, true); // default to with bots
    },

    addNewParticipantsHelper: function (render, hasBots) {
      var groupModel = this.input.groupModel;
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
      this.beforeRenderGroup1(newParticipantsModel.get("group1"));
      this.beforeRenderGroup2(newParticipantsModel.get("group2"));

      groupModel.addFromGroupModel(newParticipantsModel);

      if (render) {
        this.rerender();
      }
    }
  });

  CommonStates.Results = StateApp.ViewState.extend({
    name: "results",
    beforeRender: function () {
      // this.input is a participant collection
      this.participants = this.input.participants;
    },

    afterRender: function () {
      this.log(this.logResults());
    },

    viewOptions: function () {
      return {
        participants: this.participants,
        config: this.config
      };
    },

    handleConfigure: function () {
      this.render();
    },

    logResults: function () { }, // template method

    onExit: function () {
      return new StateApp.StateMessage({ participants: this.participants });
    }
  });

  CommonStates.GroupResults = StateApp.ViewState.extend({
    name: "results",
    beforeRender: function () {
      // this.input is a GroupModel
      this.groupModel = this.input.groupModel;
    },

    afterRender: function () {
      this.log(this.logResults());
    },

    viewOptions: function () {
      return {
        model: this.groupModel,
        group1Name: this.config.group1Name,
        group2Name: this.config.group2Name,
        group1NameSuffix: this.config.group1NameSuffix,
        group2NameSuffix: this.config.group2NameSuffix,
        config: this.config
      };
    },

    handleConfigure: function () {
      this.render();
    },

    logResults: function () { }, // template method

    onExit: function () {
      return new StateApp.StateMessage({ groupModel: this.groupModel });
    }
  });

  // expects to be a child of a MultiState or RepeatState to get the round #.
  CommonStates.Round = StateApp.MultiState.extend({
    name: "round",
    // States: [ ], array of states in the round

    setSubstateOptions: function (index, options) {
      options.round = options.parentOptions.stateIndex + 1;
      return options;
    }
  });

  CommonStates.Phase = StateApp.RepeatState.extend({
    name: "phase",
    //State: SomeState, // typically a MultiState (e.g., CommonStates.Round)
    //numRounds: 5, (alias for numRepeats)
    stateOutputsKey: "roundOutputs", // use roundOutputs instead of stateOutputs

    initialize: function () {
      if (this.numRounds != null) { // alias for numRepeats
        this.numRepeats = this.numRounds;
      }

      if (this.minRounds != null) {
        this.minRepeats = this.minRounds;
      }

      if (this.maxRounds != null) {
        this.maxRepeats = this.maxRounds;
      }

      if (this.roundOptions != null) { // alias for repeatOptions
        this.repeatOptions = this.roundOptions;
      }

      StateApp.RepeatState.prototype.initialize.apply(this, arguments);
    },

    // what is saved between each round
    roundOutput: function (output) { // alias for stateOutput
    },

    stateOutput: function (output) {
      return this.roundOutput(output);
    },
  });

  return CommonStates;
});