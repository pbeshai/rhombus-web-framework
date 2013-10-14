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

  // total an attribute in a collectino or array of models
  CommonUtil.Totals.total = function (collection, attribute) {
    var models = collection;
    if (collection instanceof Backbone.Collection) {
      collection = collection.models;
    }
    return _.reduce(collection, function (memo, p) {
      return memo + (p.get(attribute) || 0);
    }, 0);
  };

  CommonUtil.Totals.phase = function (participants, roundOutputs) {
    // save the phase total (we need to do this before results since we show the phase total there)
    participants.each(function (participant, i) {
      var alias = participant.get("alias");
      // sum up total scores from rounds in this phase
      var phaseTotal = _.reduce(roundOutputs, function (memo, roundOutput) {
        // can't simply look at roundOutput[groupX][i] because index may have changed due to latecomers
        var participantOutput = _.find(roundOutput, function (ro) {
          return ro.alias === alias;
        });

        if (participantOutput) {
          return participantOutput.score + memo;
        } else {
          console.log(i, participant.get("alias"), participantOutput, participant);
          return memo;
        }
      }, 0) + participant.get("score");
      participant.set("phaseTotal", phaseTotal);
    });
  }

  CommonUtil.Totals.groupPhase = function (groupModel, roundOutputs) {
    setPhaseTotal(1);
    setPhaseTotal(2);

    function setPhaseTotal(groupNum) {
      // save the phase total (we need to do this before results since we show the phase total there)
      groupModel.get("group" + groupNum).each(function (participant, i) {
        var alias = participant.get("alias");
        // sum up total scores from rounds in this phase
        var phaseTotal = _.reduce(roundOutputs, function (memo, roundOutput) {
          // can't simply look at roundOutput[groupX][i] because index may have changed due to latecomers
          var participantOutput = _.find(roundOutput["group" + groupNum], function (ro) {
            return ro.alias === alias;
          });

          if (participantOutput) {
            return participantOutput.score + memo;
          } else {
            console.log(i, participant.get("alias"), participantOutput, participant);
            return memo;
          }
        }, 0) + participant.get("score");
        participant.set("phaseTotal", phaseTotal);
      });
    }
  };

  return CommonUtil;
});