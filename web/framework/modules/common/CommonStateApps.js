define([
  "framework/App",
  "framework/modules/StateApp/Module",
  "framework/modules/Attendance",
  "framework/modules/common/Common",
],
function (App, StateApp, Attendance, Common) {
  var CommonStateApps = {};

  CommonStateApps.BasicApp = StateApp.App.extend({
    stateOptions: undefined,
    States: null,
    prepend: { attendance: true },
    attendanceOptions: {},

    initialize: function (attrs, options) {
      this.options = options || {};
      this.prependStates = [];
      this.States = this.States ? this.States : [];
      this.stateOptions = this.stateOptions ? this.stateOptions : [];
      this.initStateOptions();
      this.initListen();
      this.initialInput = new StateApp.StateMessage({ participants: this.get("participants") });
      StateApp.App.prototype.initialize.apply(this, arguments);
    },

    initListen: function () {
      this.stopListening();
      var participants = this.get("participants");
      if (this.options.autoAddNew) {
        this.listenTo(participants, "new-queued", function (model, collection) {
          this.addNewParticipants();
        });
      }
    },

    addNewParticipants: function () {
      var currState = this.get("currentState");
      if (currState && currState.addNewParticipants) {
        currState.addNewParticipants(true); // true to render
      } else {
        console.log("Could not add in new participants to " + currState);
      }
    },

    initStateOptions: function () { },

    defineStates: function () {
      this.states = {};
      // add in the prepend states

      this.definePrependStates();
      if (this.prependStates.length) {
        this.States = _.pluck(this.prependStates, "state").concat(this.States);
        this.stateOptions = _.pluck(this.prependStates, "options").concat(this.stateOptions);
      }

      this.defineMainStates();
    },

    definePrependStates: function () {
      // add in attendance unless false
      if (this.prepend.attendance) {
        this.attendanceOptions = _.extend({ participants: this.get("participants") }, this.attendanceOptions);
        this.prependStates.push({ state: Attendance.State, options: this.attendanceOptions });
      }
    },

    defineMainStates: function () {
      _.each(this.States, function (State, i) {
        var state = new State(_.extend({ config: this.config }, this.stateOptions[i]), this);
        this.states["state-" + (i + 1)] = state;
        if (i > 0) {
          state.setPrev(this.states["state-" + i]);
        }
      }, this);
    },

    // helper
    addAttendance: function () {
      var attendanceState = new Attendance.State(this.attendanceOptions, this);
      this.states.attendance = attendanceState;
    },
  });

  // attendance -> play [-> play2 ... ]-> results
  CommonStateApps.BasicGame = CommonStateApps.BasicApp.extend({
    partnerOptions: undefined,
    botCheckOptions: undefined,
    groupOptions: undefined,
    prepend: { attendance: true, partner: true, botCheck: true, group: false },

    definePrependStates: function () {
      CommonStateApps.BasicApp.prototype.definePrependStates.call(this);

      if (this.prepend.botCheck) {
        this.prependStates.push({ state: Common.States.BotCheck, options: this.botCheckOptions });
      }

      if (this.prepend.partner) {
        this.prependStates.push({ state: Common.States.Partner, options: this.partnerOptions });
      }

      if (this.prepend.group) {
        this.prependStates.push({ state: Common.States.Group, options: this.groupOptions });
      }
    },
  });


  CommonStateApps.PhaseGame = CommonStateApps.BasicGame.extend({
    PhaseStates: null,
    phaseConfigs: null,

    initialize: function () {
      // save the config as defaults and use a copy
      this.phaseConfigDefaults = this.phaseConfigs;
      this.phaseConfigs = $.extend(true, [], this.phaseConfigDefaults);


      _.each(this.phaseConfigs, function (phaseConfig) {
        _.defaults(phaseConfig, this.config);
      }, this);

      CommonStateApps.BasicGame.prototype.initialize.apply(this, arguments);
    },

    // default implementation assumes phases are structured: Play, Score, Bucket, Results
    getPhaseRoundOptions: function (phaseIndex, stateIndex) {
      var phaseNum = phaseIndex + 1;
      return [
          { viewOptions: { header: "Play Phase " + phaseNum } },
          undefined, // score
          undefined, // bucket
          { viewOptions: { header: "Results Phase " + phaseNum } }
        ];
    },

    getPhaseStateOptions: function (phaseIndex, stateIndex) {
      var phaseNum = phaseIndex + 1;
      var phaseStates = this.PhaseStates[phaseIndex];
      var state = phaseStates[stateIndex];
      switch (state.prototype.name) {
        case "phase": // options for Round
          return _.extend({
            config: this.phaseConfigs[phaseIndex],
            name: "phase " + phaseNum,
            roundOptions: this.getPhaseRoundOptions(phaseIndex, stateIndex)
          });

        case "bucket": // options for phase total bucket
          return { phase: phaseNum };

        case "phase-results": // options for phase results
          return {
            config: this.phaseConfigs[phaseIndex],
            phase: phaseNum,
            viewOptions: {
              header: "Phase " + phaseNum + " Total Results"
            }
          };

        case "total-results": // options for total results
          var header = "Total Results from Phase";
          if (phaseNum === 1) {
            header += " 1";
          } else if (phaseNum === 2) {
            header += "s 1 &amp; 2";
          } else {
            header += "s 1 to " + phaseNum;
          }
          return {
            config: this.config,
            numPhases: phaseNum,
            viewOptions: {
              header: header
            }
          };
      }
    },

    addPhaseStates: function () {
      // for each phase
      _.each(this.PhaseStates, function (SinglePhaseStates, i) {
        // for each state in the phase
        _.each(SinglePhaseStates, function (State, j) {
          this.States.push(State);
          this.stateOptions.push(this.getPhaseStateOptions(i, j));
        }, this);
      }, this);
    },

    defineMainStates: function () {
      this.addPhaseStates();
      CommonStateApps.BasicGame.prototype.defineMainStates.call(this);
    },

    handleConfigure: function () {
      console.log("phase handle configure", this.config, this.phaseConfigs);
      // update the phase configs
      _.each(this.phaseConfigs, function (phaseConfig) {
        _.extend(phaseConfig, this.config);
      }, this);

      CommonStateApps.BasicGame.prototype.handleConfigure.call(this);
    },
  });

  return CommonStateApps;
});