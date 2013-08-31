define([
  "app",
  "apps/StateApp",
  "modules/Attendance",
  "modules/common/Common",
],
function(app, StateApp, Attendance, Common) {
  var CommonStateApps = {};

  CommonStateApps.BasicApp = StateApp.App.extend({
    stateOptions: undefined,
    States: null,
    prepend: { attendance: true },
    attendanceOptions: {
      acceptNew: true,
      saveNew: false
    },

    initialize: function () {
      this.prependStates = [];
      this.States = this.States ? this.States : [];
      this.stateOptions = this.stateOptions ? this.stateOptions : [];
      this.initStateOptions();
      this.initialInput = new StateApp.StateMessage({ participants: this.get("participants") });
      StateApp.App.prototype.initialize.call(this);
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

    // helper for those that override defineMainStates
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
      this.phaseConfigs = this.phaseConfigs ? this.phaseConfigs : [];
      _.each(this.phaseConfigs, function (phaseConfig) {
        _.defaults(phaseConfig, this.config);
      }, this);

      CommonStateApps.BasicGame.prototype.initialize.apply(this, arguments);
    },

    getPhaseStateOptions: function (phaseIndex, stateIndex) { }, // template method

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
      // update the phase configs
      _.each(this.phaseConfigs, function (phaseConfig) {
        _.extend(phaseConfig, this.config);
      }, this);

      CommonStateApps.BasicGame.prototype.handleConfigure.call(this);
    },
  });

  return CommonStateApps;
});