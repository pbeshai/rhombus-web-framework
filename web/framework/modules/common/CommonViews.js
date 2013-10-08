define([
  "framework/App",
  "framework/modules/common/CommonModels"
],
function (App, CommonModels) {
  var CommonViews = {};

  // sets 'this.options' and overrides properties with options if specified
  function handleOptions(object, options) {
    // options = _.extend(object.options || {}, options);
    object.options = options = (options || {});

    // override properties with options if specified
    _.each(object.optionProperties, function (property) {
      if (options[property]) {
        object[property] = options[property];
      }
    });
  }

  // returns either the value itself or if it is a function, it gets evaluated
  // passing in extra args.
  function functionValue(value) {
    if (_.isFunction(value)) {
      var args = Array.prototype.slice.call(arguments, 1);
      return value.apply(this, args);
    }
    return value;
  }

  CommonViews.Instructions = App.BaseView.extend({
    template: "framework/templates/common/instructions",
    className: "instructions",

    serialize: function () {
      return {
        header: this.model.get("header") || "Instructions",
        layout: this.model.get("layout"),
        description: this.model.get("description"),
        buttons: [ "A", "B", "C", "D", "E" ],
        buttonConfig: this.model.get("buttonConfig"), // buttonConfig: { A: { description: "" }, B: undefined } undefined = disabled
      };
    },

    initialize: function () {
      this.listenTo(this.model, "change", this.render); // ensures the view is up to date
    }
  });

  CommonViews.Count = App.BaseView.extend({
    className: "count",

    count: function (collection) { // defaults to counting those who have made choices
      return collection.reduce(function(memo, p) {
        if (p.get("choice")) {
          return memo + 1;
        }
        return memo;
      }, 0);
    },

    afterRender: function () {
      var count = this.count(this.participants);
      if (this.options.parens) {
        count = "(" + count + ")";
      }
      this.el.innerHTML = count;

      App.BaseView.prototype.afterRender.call(this);
    },

    initialize: function () {
      App.BaseView.prototype.initialize.apply(this, arguments);
      this.listenTo(this.participants, "update", this.render);
    }
  });

  // needs option 'endTime' in ms set
  CommonViews.Countdown = App.BaseView.extend({
    timer: null,
    className: "countdown animated",
    afterRender: function () {
      var timeLeft = Math.max(parseInt((this.options.endTime / 1000) - (new Date().getTime() / 1000), 10), 0);
      this.timeLeft = timeLeft;
      var seconds = timeLeft % 60;
      var minutes = parseInt(timeLeft / 60, 10);
      function z(str) { // add leading zero
        return ("0"+str).slice(-2);
      }
      var formattedTime = z(minutes) + ":" + z(seconds);

      this.$el.html("<div class='countdown-highlight'>" + formattedTime + "</div>" + formattedTime);
      if (timeLeft < 10) {
        this.$(".countdown-highlight").css("opacity", 1 - (timeLeft / 10));
      }
      if (timeLeft <= 3) {
        this.$el.removeClass("pulse");
        this.restartCssAnimationFix();
        if (timeLeft === 0) {
          this.$(".countdown-highlight").addClass("animated flash");
        } else {
          this.$el.addClass("pulse");
        }
      }

      if (timeLeft > 0) {
        this.clearTimer();
        this.timer = setTimeout(_.bind(this.render, this), 1000);
      }
    },

    clearTimer: function () {
      if (this.timer != null) {
        clearTimeout(this.timer); // make sure any existing timer is stopped
        this.timer = null;
      }
    },

    cleanup: function () {
      console.log("cleaning up countdown");
      this.clearTimer();
    }
  });

  CommonViews.PercentageBar = App.BaseView.extend({
    template: "framework/templates/common/percentage_bar",
    hoverLabels: true,
    serialize: function () {
      return {
        hoverLabels: this.hoverLabels,
        sections: this.percentageSections()
      };
    },

    percentageSections: function () {
      return this.options.sections;
    }
  });

  CommonViews.ChoicePercentageBar = CommonViews.PercentageBar.extend({
    choices: {
      "A" : { label: "A", key: "choice-a" },
      "B" : { label: "B", key: "choice-b" },
      "C" : { label: "C", key: "choice-c" },
      "D" : { label: "D", key: "choice-d" },
      "E" : { label: "E", key: "choice-e" },
      "null" : { label: "#", key: "choice-null" }
    },

    percentageSections: function () {
      var sections = [];

      var total = this.participants.length;

      var counts = _.countBy(this.participants.pluck("choice"), function (choice) {
        return choice;
      });

      _.each(_.keys(this.choices), addSection, this);

      function addSection(choice) {
        if (counts[choice]) {
          var section = _.extend({ percentage: (100 * counts[choice] / total).toFixed(1) }, this.choices[choice]);
          sections.push(section);
        }
      }

      return sections;
    }
  });


  CommonViews.ParticipantDisplay = App.BaseView.extend({
    template: "framework/templates/common/participant_display",
    className: "participant",
    optionProperties: [ "locked", "cssClass", "bottomText", "mainText", "overlay", "image" ],
    locked: false,
    overlay: function (model) { },
    cssClass: function (model) { },
    bottomText: function (model) { },
    mainText: function (model) { return model.get("choice"); },
    idText: function (model) { return model.get("alias"); },
    image: function (model) { return "/app/img/alias/" + model.get("alias") + ".jpg"; },

    serialize: function () {
      return {
        model: this.model,
        idText: this.idText(this.model),
        bottomText: this.bottomText(this.model),
        mainText: this.mainText(this.model),
        overlay: this.overlay(this.model),
        image: this.image(this.model)
      };
    },

    beforeRender: function () {
      // reset any extra classes added in after render (do this since we
      // do not know which classes are added by this.cssClass)
      this.$el.attr("class", this.className);

      this.restartCssAnimationFix();
      this.$el.addClass(this.cssClass(this.model));

      // handle the overlay carefully so it can be preserved between renders (for animation)
      if (this.$overlay) {
        this.$overlay.remove();
      }

      // set up image
      var img = this.image(this.model);
      var bgImage = this.$el.css("background-image");

      if (img && (!bgImage || bgImage === "none")) {
        this.$el.css("background-image", "url(" + img + ")");
      } else if (!img && bgImage !== "none") {
        this.$el.css("background-image", "none");
      }
    },

    afterRender: function () {
      App.BaseView.prototype.afterRender.call(this);

      var bottomText = this.bottomText(this.model);
      if (bottomText) {
        this.$el.addClass("has-bottom");
      } else {
        this.$el.removeClass("has-bottom");
      }

      // add the overlay back (or for the first time)
      var overlay = this.overlay(this.model);
      if (overlay) {
        if (this.$overlay) {
          this.$overlay.prependTo(this.$el);
        } else {
          this.$overlay = $("<div class='overlay'/>").prependTo(this.$el);
        }
        this.restartCssAnimationFix(this.$overlay.get(0));
        this.$overlay.attr("class", "overlay " + overlay);
      }
    },

    safeRender: function () {
      if (!this.locked) {
        this.render();
      }
    },

    initListen: function () {
      this.listenTo(this.model, "change", this.safeRender);
    },

    initialize: function (options) {
      App.BaseView.prototype.initialize.apply(this, arguments);
      handleOptions(this, options);
      this.initListen(); // template method for initializing listening of events
    }
  });

  CommonViews.ParticipantPlay = CommonViews.ParticipantDisplay.extend({
    className: "participant player",
    playedClass: "played",
    playedSelector: ".message-text", // the element that fades in after each play

    getScore: function (model) {
      return model.get("score");
    },

    // default to showing previous score
    bottomText: function (model) {
      if (this.getScore(model) != null) {
        return "Prev. " + this.getScore(model);
      }
    },

    cssClass: function (model) {
      if (model.get("played")) {
        return this.playedClass;
      }
    },

    overlay: function (model) {
      if (model.get("played")) {
        return "player played";
      }
      return "player";
    },

    afterRender: function () {
      var played = this.model.get("played");

      // fade in if at least second render and the participant has played
      if ((!this.initialRender || this.forceFade) && played) {
        var fullOpacity = parseFloat(this.$(this.playedSelector).css("opacity"));
        this.$(this.playedSelector).css("opacity", 0).delay(100).animate({ opacity: fullOpacity }, 400);
      }

      CommonViews.ParticipantDisplay.prototype.afterRender.call(this);
    }
  });

  CommonViews.ParticipantHiddenPlay = CommonViews.ParticipantPlay.extend({
    mainText: function (model) {
      if (model.get("played")) {
        return "Played";
      }
    }
  });

  // creates a participant with a message inside it (e.g. the offer in the ultimatum game)
  CommonViews.ParticipantMessagePlay = CommonViews.ParticipantPlay.extend({
    messageAttribute: "message",
    optionProperties: [ "messageAttribute" ].concat(CommonViews.ParticipantPlay.prototype.optionProperties),
    playedSelector: ".bottom-text",

    mainText: function (model) {
      return this.model.get(this.messageAttribute);
    },

    overlay: function (model) {
      if (model.get("played")) {
        return "player played";
      }
      return "player no-animate message";
    },

    bottomText: function (model) {
      if (this.model.get("played")) {
        return "Played";
      }
      return " "; // forces the 'has-bottom' class to always be there
    }
  });

  CommonViews.ParticipantAlias = CommonViews.ParticipantPlay.extend({
    className: "participant-alias",
    playedSelector: ".id-text",
    mainText: function () { },
    overlay: function (model) { },
    image: function (model) { }
  });


  CommonViews.ParticipantsGrid = App.BaseView.extend({
    className: "participant-grid",
    ParticipantView: CommonViews.ParticipantDisplay,
    insertSorted: true,
    optionProperties: [ "ParticipantView", "insertSorted" ],

    beforeRender: function () {
      if (!this.participants) return;
      this.participants.each(function (participant) {
        this.insertView(new this.ParticipantView({ model: participant }));
      }, this);
    },

    add: function (participant) {
      var newView = new this.ParticipantView({ model: participant });
      this.insertView(newView);
      newView.render(); // note that this adds the view as a child of this.$el

      // place in the sorted location
      if (this.insertSorted) {
        var $beforeElem = this.$el.children().eq(this.participants.indexOf(participant));
        if ($beforeElem.get(0) !== newView.el) { // make sure they are not the same item, otherwise it doesn't show up
          $beforeElem.before(newView.$el);
        }
      }

    },

    initialize: function (options) {
      App.BaseView.prototype.initialize.apply(this, arguments);
      handleOptions(this, options);

      this.listenTo(this.participants, {
        "add": this.add
      });
    }
  });

  CommonViews.ParticipantsList = CommonViews.ParticipantsGrid.extend({
    className: null,
    ParticipantView: CommonViews.ParticipantAlias
  });

  CommonViews.ParticipantScoreDisplay = CommonViews.ParticipantDisplay.extend({
    locked: true,
    scoreAttribute: "score",
    maxScoreAttribute: "bucketMax",

    getScore: function (model) {
      return model.get(this.scoreAttribute);
    },

    getMaxScore: function (model) {
      if (this.maxScoreAttribute == null) {
        return null;
      }

      return model.get(this.maxScoreAttribute);
    },

    overlay: function (model) {
      var overlay = "no-animate";
      if (this.maxScoreAttribute != null && this.getScore(model) === this.getMaxScore(model)) {
        overlay += " max-score";
      }

      return overlay;
    },

    mainText: function (model) {
      return this.getScore(model);
    },
  });

  CommonViews.ParticipantScoreChoiceDisplay = CommonViews.ParticipantScoreDisplay.extend({
    maxScoreAttribute: null,
    totalAttribute: "phaseTotal",

    labelChoice: function (choice) {
      return choice;
    },

    mainText: function (model) {
      var choice = this.labelChoice(model.get("choice")),
          partnerChoice = this.labelChoice(model.get("partner").get("choice"));

      var outcome = choice + partnerChoice;
      if (this.getScore(model) != null) {
        outcome += " " + this.getScore(model);
      }

      return outcome;
    },

    getTotal: function (model) {
      return model.get(this.totalAttribute);
    },

    bottomText: function (model) {
      if (this.totalAttribute != null && this.getTotal(model) != null) {
        return "Total " + this.getTotal(model);
      }
    }
  });


  // uses a Participant collection
  CommonViews.SimpleLayout = App.BaseView.extend({
    template: "framework/templates/common/simple_layout",
    // properties that can be overridden via options
    optionProperties: [ "header", "ParticipantView", "ParticipantsView", "PreParticipantsView",
      "PostParticipantsView", "InstructionsModel", "noParticipantsMessage"],
    header: "Participants",
    HeaderView: null,
    ParticipantView: null,
    ParticipantsView: CommonViews.ParticipantsGrid,
    PreParticipantsView: null,
    PostParticipantsView: null,
    PreHeaderView: null,
    InstructionsModel: null,
    noParticipantsMessage: "No participants.",

    serialize: function () {
      return {
        header: this.header,
        hasParticipants: (this.participants && this.participants.length > 0),
        noParticipantsMessage: this.noParticipantsMessage
      };
    },

    beforeRender: function () {
      var viewOptions = _.extend({
        participants: this.participants
      }, this.options);
      if (this.PreHeaderView != null) {
        this.insertView(".pre-header", new this.PreHeaderView(viewOptions));
      }

      if (this.HeaderView != null) {
        this.setView(".layout-header", new this.HeaderView(viewOptions));
      }

      if (this.ParticipantView != null) {
        var view = new this.ParticipantsView(_.extend({
            ParticipantView: this.ParticipantView
          }, viewOptions));

        this.setView(".participants", view);

      } else {
        this.setView(".participants", new this.ParticipantsView(viewOptions));
      }

      if (this.PreParticipantsView != null) {
        this.insertView(".pre-participants", new this.PreParticipantsView(viewOptions));
      }

      if (this.PostParticipantsView != null) {
        this.insertView(".post-participants", new this.PostParticipantsView(viewOptions));
      }

      if (this.InstructionsModel != null) {
        this.insertView(new CommonViews.Instructions({ model: new this.InstructionsModel(null, { config: this.options.config }) }));
      }
    },

    add: function (participant) {
      if (this.participants.length === 1) {
        this.render();
      }
    },

    initialize: function (options) {
      App.BaseView.prototype.initialize.apply(this, arguments);
      handleOptions(this, options);

      this.listenTo(this.participants, {
        "add": this.add
      });
    },
  });


  // requires model Common.Models.GroupModel or similar
  CommonViews.GroupLayout = App.BaseView.extend({
    template: "framework/templates/common/group_layout",
    header: "Groups",
    group1Name: "Group 1",
    group2Name: "Group 2",
    ParticipantView: null,
    ParticipantsView: CommonViews.ParticipantsGrid,
    PreParticipantsView: null,
    PostParticipantsView: null,
    PreHeaderView: null,
    PreGroupsView: null,
    PostGroupsView: null,
    InstructionsModel: null,
    noParticipantsMessage: "No participants.",
    inactive: {},
    optionProperties: [ "header", "group1Name", "group2Name", "group1NameSuffix", "group2NameSuffix", "group1HeaderRight", "group2HeaderRight",
                        "ParticipantView", "ParticipantsView", "PreParticipantsView", "PostParticipantsView",
                        "PreGroupsView", "PostGroupsView", "InstructionsModel", "inactive", "noParticipantsMessage" ],

    serialize: function () {
      return {
        header: this.header,
        hasParticipants: (this.model.get("participants").length > 0),
        noParticipantsMessage: this.noParticipantsMessage,
        group1Name: this.group1Name,
        group2Name: this.group2Name,
        group1NameSuffix: this.group1NameSuffix,
        group2NameSuffix: this.group2NameSuffix,
        group1HeaderRight: functionValue.call(this, this.group1HeaderRight),
        group2HeaderRight: functionValue.call(this, this.group2HeaderRight),
      };
    },

    beforeRender: function () {
      function addGroup(groupNum) {
        var viewOptions = _.extend({
          participants: this.model.get("group" + groupNum)
        }, this.options, this.options["group" + groupNum + "ViewOptions"]);
        // only specify ParticipantView if it is set.
        if (this.ParticipantView != null) {
          if (_.isFunction(this.ParticipantView)) {
            viewOptions.ParticipantView = this.ParticipantView;
          } else if (this.ParticipantView["group" + groupNum] != null) {
            viewOptions.ParticipantView = this.ParticipantView["group" + groupNum];
          }
        }
        this.insertView(".group" + groupNum + " .group-participants", new this.ParticipantsView(viewOptions));

        if (this.PreParticipantsView != null) {
          this.insertView(".group" + groupNum + " .pre-participants", new this.PreParticipantsView(viewOptions));
        }

        if (this.PostParticipantsView != null) {
          this.insertView(".group" + groupNum + " .post-participants", new this.PostParticipantsView(viewOptions));
        }
      }

      if (this.PreHeaderView != null) {
        this.insertView(".pre-header", new this.PreHeaderView(viewOptions));
      }

      addGroup.apply(this, [1]);
      addGroup.apply(this, [2]);

      var viewOptions = _.extend({
        participants: this.model.get("participants")
      }, this.options);

      if (this.PreGroupsView != null) {
        this.insertView(".pre-groups", new this.PreGroupsView(viewOptions));
      }

      if (this.PostGroupsView != null) {
        this.insertView(".post-groups", new this.PostGroupsView(viewOptions));
      }

      if (this.InstructionsModel != null) {
        this.insertView(new CommonViews.Instructions({ model: new this.InstructionsModel(null, { config: this.options.config }) }));
      }
    },

    afterRender: function () {
      if (this.inactive.group1) {
        this.$(".group1").addClass("inactive");
      }
      if (this.inactive.group2) {
        this.$(".group2").addClass("inactive");
      }
    },

    initialize: function (options) {
      handleOptions(this, options);
    },
  });

  CommonViews.GroupConfigure = App.BaseView.extend({
    template: "framework/templates/common/group_configure",
    modelOptions: {
      group1Name: "Group 1",
      group2Name: "Group 2"
    },
    optionProperties: [ "nameHeader", "group1Label", "group2Label" ],
    nameHeader: "Group Names",
    group1Label: "Group 1",
    group2Label: "Group 2",

    events: {
      "change #group1-name-input" : "updateGroup1Name",
      "change #group2-name-input" : "updateGroup2Name"
    },

    serialize: function () {
      return {
        nameHeader: this.nameHeader,
        group1Label: this.group1Label,
        group2Label: this.group2Label,
        group1Name: this.model.get("group1Name"),
        group2Name: this.model.get("group2Name")
      };
    },

    updateGroup1Name: function (evt) {
      var group1Name = this.$("#group1-name-input").val();
      this.model.set("group1Name", group1Name);
    },

    updateGroup2Name: function (evt) {
      var group2Name = this.$("#group2-name-input").val();
      this.model.set("group2Name", group2Name);
    },

    initialize: function (options) {
      handleOptions(this, options);

      // use defaults so we don't overwrite if already there
      _.defaults(this.model.attributes, this.modelOptions);
    }
  });

  /*
  Model configure is for automatically generating a form from a JS object
  Typically used as a Views.Configure for apps
  */
  CommonViews.ModelConfigure = {};
  var inputIds = 0;
  CommonViews.ModelConfigure.TextInput = App.BaseView.extend({
    template: "framework/templates/common/model_configure/text_input",
    events: {
      "change input": "update",
    },

    update: function (evt) {
      // attach an empty {} for flags that event handlers can use to communicate with
      this.trigger("update", this.options.key, evt.target.value, {});
    },

    serialize: function () {
      return {
        value: this.options.value,
        label: this.options.label,
        inputId: this.inputId
      };
    },

    initialize: function (options) {
      this.inputId = "model-configure-input-" + (inputIds++);
    }
  });

  CommonViews.ModelConfigure.ObjectConfigure = App.BaseView.extend({
    className: "object-configure",
    template: "framework/templates/common/model_configure/object_configure",

    serialize: function () {
      return {
        header: this.options.header,
      };
    },

    prettifyLabel: function (attr) {
      return _.map(attr, function (char, i) {
        if (i === 0) { // capitalize first letter
          return char.toUpperCase();
        }

        // add a space before a capital or a number
        return (/[A-Z0-9]/.test(char)) ? " "+char : char;
      }).join("");
    },

    beforeRender: function () {
      // handle simple properties first
      _.each(_.keys(this.model), function (attr) {
        var val = this.model[attr];
        if (!_.isObject(val)) { // insert a text field
          this.insertView(new CommonViews.ModelConfigure.TextInput({ key: attr, label: this.prettifyLabel(attr), value: val }));
        }
      }, this);

      // then handle objects
      _.each(_.keys(this.model), function (attr) {
        var val = this.model[attr];
        if (_.isObject(val)) {
          this.insertView(new CommonViews.ModelConfigure.ObjectConfigure({ key: attr, header: this.prettifyLabel(attr), model: val }));
        }
      }, this);
    },

    onUpdate: function (key, value, flags) {
      if (flags.handled) {
        return;
      }
      flags.handled = true;

      var curr = this.model[key];
      if (_.isNumber(curr)) { // if the current value is a number, try making this one a nubmer
        try {
          value = parseFloat(value);
        } catch (e) {
          console.log(e);
        }
      }
      this.model[key] = value;
    },

    initialize: function () {
      this.on("update", this.onUpdate);
    }
  });


  CommonViews.ModelConfigure.Layout = App.BaseView.extend({
    template: "framework/templates/common/model_configure/layout",

    serialize: function () {
      return this.model.attributes;
    },

    prettifyLabel: function (attr) {
      return _.map(attr, function (char, i) {
        if (i === 0) { // capitalize first letter
          return char.toUpperCase();
        }

        // add a space before a capital or a number
        return (/[A-Z0-9]/.test(char)) ? " "+char : char;
      }).join("");
    },

    beforeRender: function () {
      // handle simple properties first
      _.each(_.keys(this.model.attributes), function (attr) {
        var val = this.model.attributes[attr];

        if (!_.isObject(val)) { // insert a text field
          this.insertView(".form", new CommonViews.ModelConfigure.TextInput({ key: attr, label: this.prettifyLabel(attr), value: val }));
        }
      }, this);

      // then objects
      _.each(_.keys(this.model.attributes), function (attr) {
        var val = this.model.attributes[attr];

        if (_.isObject(val)) {
          this.insertView(".form", new CommonViews.ModelConfigure.ObjectConfigure({ key: attr, header: this.prettifyLabel(attr), model: val }));
        }
      }, this);
    },

    onUpdate: function (key, value, flags) {
      if (flags.handled) {
        return;
      }
      flags.handled = true;

      var curr = this.model.get(key);
      if (_.isNumber(curr)) { // if the current value is a number, try making this one a nubmer
        try {
          value = parseFloat(value);
        } catch (e) {
          console.log(e);
        }
      }
      this.model.set(key, value);
    },

    initialize: function () {
      // use defaults so we don't overwrite if already there
      _.defaults(this.model.attributes, this.modelOptions);

      this.on("update", this.onUpdate);
    }
  });

  /* App Controls */
  CommonViews.StateControls = App.BaseView.extend({
    template: "framework/templates/common/state_controls",

    events: {
      "click .next-state" : "nextState",
      "click .prev-state" : "prevState",
      "click .show-view-states-only" : "toggleViewStates"
    },

    initialize: function (options) {
      this.listenTo(this.options.activeApp, "change:currentState initialize", this.render);
      this.model = new Backbone.Model({ "views-only": true });
    },

    serialize: function () {
      return {
        states: this.options.activeApp.states,
        currentState: this.options.activeApp.get("currentState"),
        viewsOnly: this.model.get("views-only")
      };
    },

    nextState: function () {
      App.controller.appNext();
    },

    prevState: function () {
      App.controller.appPrev();
    },

    toggleViewStates: function (evt) {
      var viewsOnly = $(evt.target).prop("checked");
      this.model.set("views-only", viewsOnly); // persist it so on re-render it remembers

      if (viewsOnly) {
        this.$(".states").addClass("view-states-only");
      } else {
        this.$(".states").removeClass("view-states-only");
      }
    }
  });

  CommonViews.AppControls = App.BaseView.extend({
    className: "controls",
    template: "framework/templates/common/app_controls",
    optionProperties: [ "appConfigView" ],

    initialize: function (options) {
      handleOptions(this, options);
    },

    serialize: function () {
      return {
        title: this.options.title
      };
    },

    beforeRender: function () {
      if (this.AppConfigView) {
        this.setView(".configure", new CommonViews.Configure({ AppConfigView: this.AppConfigView }));
      }
      this.setView(".state-controls", new CommonViews.StateControls(this.options));
    },

    afterRender: function () {
      if (this.AppConfigView == null) {
        this.$(".configure").hide();
      }
    },
  });

  CommonViews.Configure = App.BaseView.extend({
    template: "framework/templates/common/configure",

    events: {
      "change .config-message": "updateMessage",
      "click .update-config": "submit"
    },

    beforeRender: function () {
      if (this.options.AppConfigView) {
        this.insertView(".app-config-view", new this.options.AppConfigView({ model: this.model }));
      }
    },

    updateMessage: function (evt) {
      this.model.set("message", $(evt.target).val());
    },

    serialize: function () {
      return {
        model: this.model
      };
    },

    submit: function () {
      this.model.save();
      this.render();
    },

    initialize: function () {
      this.model = new CommonModels.ConfigureModel();
    }
  });


  return CommonViews;
});