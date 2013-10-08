define([
  "framework/App",
  "framework/modules/common/CommonUtil",
],
function (App, CommonUtil) {
  var CommonMixins = {
    Views: {}
  };

  CommonMixins.Views.RoundLabel = App.BaseView.extend({
    tagName: "span",
    className: "round-label",
    afterRender: function () {
      if (this.options.round !== undefined) {
        this.$el.html("Round " + this.options.round);
      }
    },
  });

  CommonMixins.mixin = function (mixins, Layout) {
    _.each(mixins, function (mixinName) {
      Layout = CommonMixins[mixinName](Layout);
    });
    return Layout;
  };

  CommonMixins.bucketParticipant = function (ParticipantDisplay) {
    return ParticipantDisplay.extend({
      overlay: function (model) {
        var overlay = ParticipantDisplay.prototype.overlay.apply(this, arguments);
        var bucket = model.get("bucket");
        if (bucket != null) {
          if (!overlay) {
            overlay = "";
          }
          overlay += " bucket-" + bucket;

          if (this.bucketChoiceMap) {
            var bucketChoiceClass = this.bucketChoiceMap[model.get("choice")];
            if (bucketChoiceClass) {
              overlay += " " + bucketChoiceClass;
            } else if (this.bucketChoiceMap.default) {
              overlay += " " + this.bucketChoiceMap.default;
            }
          }
        // the mapping is defined with a default specified, so give it to those with no bucket value
        } else if (this.bucketChoiceMap && this.bucketChoiceMap.default) {
          overlay += " " + this.bucketChoiceMap.default;
        }
        return overlay;
      },
    });
  };

  CommonMixins.gameOver = function (Layout) {
    return Layout.extend({
      serialize: function () {
        var superSerialize = Layout.prototype.serialize.call(this);
        var gameOver = this.options.config.gameOver;
        if (gameOver) {
          superSerialize.header = "Game Over"; // TODO: what if we want to keep the old header too?
        }
        return superSerialize;
      }
    });
  };


  CommonMixins.rounds = function (Layout) {
    return Layout.extend({
      beforeRender: function () {
        Layout.prototype.beforeRender.call(this);
        this.insertView(".layout-header-h1", new CommonMixins.Views.RoundLabel({ round: this.options.round }));
      }
    });
  };

  CommonMixins.phaseTotals = function (Layout) {
    return Layout.extend({
      group1HeaderRight: function () { return CommonUtil.Totals.total(this.model.get("group1"), "phaseTotal"); },
      group2HeaderRight: function () { return CommonUtil.Totals.total(this.model.get("group2"), "phaseTotal"); }
    });
  };

  CommonMixins.totals = function (Layout) {
    return Layout.extend({
      group1HeaderRight: function () { return CommonUtil.Totals.total(this.model.get("group1"), "total"); },
      group2HeaderRight: function () { return CommonUtil.Totals.total(this.model.get("group2"), "total"); }
    });
  };

  return CommonMixins;
});