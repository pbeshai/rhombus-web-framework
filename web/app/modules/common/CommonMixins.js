define([
  "app"
],
function() {
  var CommonMixins = {
    Views: {}
  };

  CommonMixins.Views.RoundLabel = Backbone.View.extend({
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
      cssClass: function (model) {
        var bucket = model.get("bucket");
        if (bucket != null) {
          return "bucket-" + bucket;
        }
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
        this.insertView(".layout-header", new CommonMixins.Views.RoundLabel({ round: this.options.config.round }));
      }
    });
  };

  return CommonMixins;
});