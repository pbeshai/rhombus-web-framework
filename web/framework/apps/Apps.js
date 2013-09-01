/**
	collection of all apps. Used by the router.
*/
define([
	"App",
],
function (App) {

	var Apps = App.module();

	Apps.Views.Selector = App.BaseView.extend({
		template: "framework/templates/apps/selector",
		className: "app-selector",
		events: { "click button" : "selectApp" },

		serialize: function () {
			return { apps: App.apps };
		},

		selectApp : function (evt) {
			var $btn = $(evt.target);
			var selectedApp = App.apps[$btn.data("key")];

			$btn.removeClass("inactive").addClass("active");
			this.$("button").not($btn).addClass("inactive").removeClass("active");
			this.trigger("app-selected", selectedApp);
		},
	});
	return Apps;
});