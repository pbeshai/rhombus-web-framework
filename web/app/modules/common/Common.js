define([
  "app",
  "modules/common/CommonModels",
  "modules/common/CommonViews",
  "modules/common/CommonMixins",
  "modules/common/CommonStates",
],

function (app, CommonModels, CommonViews, CommonMixins, CommonStates) {
  // can't include CommonStateApps since it depends on Attendance, which depends on Common
  var Common = {
    Models: CommonModels,
    Views: CommonViews,
    Mixins: CommonMixins,
    States: CommonStates
  };

  return Common;
});