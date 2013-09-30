define([
  "framework/modules/common/CommonModels",
  "framework/modules/common/CommonViews",
  "framework/modules/common/CommonMixins",
  "framework/modules/common/CommonStates",
  "framework/modules/common/CommonUtil"
],

function (CommonModels, CommonViews, CommonMixins, CommonStates, CommonUtil) {
  // can't include CommonStateApps since it depends on Attendance, which depends on Common
  var Common = {
    Models: CommonModels,
    Views: CommonViews,
    Mixins: CommonMixins,
    States: CommonStates,
    Util: CommonUtil
  };

  return Common;
});