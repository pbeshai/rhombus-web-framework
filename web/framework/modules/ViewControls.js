/**

	A simple grid app for displaying choices

*/
define([
	// Application.
	"framework/App",
],

function (App) {

	var ViewControls = App.module();

	ViewControls.Models = {};
	ViewControls.Models.Zoom = Backbone.Model.extend({
		maxLevel: 10,
		minLevel: 0,
		startLevel: 1,

		zoomIn: function () {
			var level = this.get("level");
			if (level < this.maxLevel) {
				this.set("level", level + 1);
			}
		},

		zoomOut: function () {
			var level = this.get("level");
			if (level > this.minLevel) {
				this.set("level", level - 1);
			}
		},

		initialize: function () {
			this.set("level", this.startLevel);
		}
	});

	ViewControls.Views.Zoom = App.BaseView.extend({
		template: "framework/templates/viewcontrols/zoom",
		events: {
			"click .zoom-out" : "zoomOut",
			"click .zoom-in" : "zoomIn",
			"click .zoom-box" : "zoom"
		},

		serialize: function () {
			return {
				level: this.model.get("level"),
				classes: this.classes
			};
		},

		zoom: function (event) {
			var level = $(event.target).data("level");
			this.model.set("level", level);
		},

		zoomOut: function () {
			this.model.zoomOut();
		},

		zoomIn: function (event) {
			this.model.zoomIn();
		},

		beforeRender: function () {
			var level = this.model.get("level");
			$("#main").removeClass(this.classes.join(" ")).addClass(this.classes[level]);
		},

		initialize: function () {
			this.classes = [];
			for (var i = this.model.minLevel; i < this.model.maxLevel + 1; i++) {
				this.classes.push("zoom-" + i);
			}
			this.listenTo(this.model, "change", this.render);
		}
	});

	ViewControls.Views.Controls = App.BaseView.extend({
		template: "framework/templates/viewcontrols/viewcontrols",

		beforeRender: function () {
			this.setViews({ ".zoom-controls": new ViewControls.Views.Zoom({ model: this.zoomModel }) });
		},
		initialize: function () {
			this.zoomModel = new ViewControls.Models.Zoom();
		}
	});

	return ViewControls;
});