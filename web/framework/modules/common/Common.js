define([
  "framework/modules/common/CommonModels",
  "framework/modules/common/CommonViews",
  "framework/modules/common/CommonMixins",
  "framework/modules/common/CommonStates",
],

function (CommonModels, CommonViews, CommonMixins, CommonStates) {
  // can't include CommonStateApps since it depends on Attendance, which depends on Common
  var Common = {
    Models: CommonModels,
    Views: CommonViews,
    Mixins: CommonMixins,
    States: CommonStates
  };

  return Common;
});