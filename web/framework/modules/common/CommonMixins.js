define([
  "framework/App"
],
function (App) {
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

  return CommonMixins;
});