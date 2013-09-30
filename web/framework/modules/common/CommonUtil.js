define([
  "framework/App",
],
function (App) {
  var CommonUtil = {};

  CommonUtil.Scoring = {}; // algorithms for assigning scores

  CommonUtil.Scoring.matrix = function (matrix, model) {
    var pairChoices = model.get("choice") + model.get("partner").get("choice");
    model.set({
      "score": matrix[pairChoices],
      "pairChoices": pairChoices
    });
  };

  CommonUtil.Totals = {};

  CommonUtil.Totals.groupPhase = function (groupModel, roundOutputs) {
    savePhaseTotal(1);
    savePhaseTotal(2);

    function savePhaseTotal(groupNum) {
      // save the phase total (we need to do this before results since we show the phase total there)
      groupModel.get("group" + groupNum).each(function (participant, i) {
        // sum up total scores from rounds in this phase
        var phaseTotal = _.reduce(roundOutputs, function (memo, roundOutput) {
          var participantOutput = roundOutput["group" + groupNum][i];
          if (participantOutput && participantOutput.alias === participant.get("alias")) {
            return participantOutput.score + memo;
          } else {
            return memo;
          }
        }, 0) + participant.get("score");
        participant.set("phaseTotal", phaseTotal);
      });
    }
  };

  return CommonUtil;
});