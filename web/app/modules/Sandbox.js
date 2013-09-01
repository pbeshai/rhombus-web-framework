/**

	A place to test things.

*/
define([
	// Application.
	"App",
	"framework/modules/common/Common",
	"framework/vendor/d3/rickshaw",
	"framework/util/d3/rickshaw/graphs"
],

function (App, Common, Rickshaw, Graphs) {

	var Sandbox = App.module();

	Sandbox.Instructions = Common.Models.Instructions.extend({
		configInit: function (config) {
			this.attributes.description = "DESC" + config.key;
			this.attributes.buttonConfig = {
				B: { description: "testing " + config.key}
			};
		}
	});

	Sandbox.Views.Sandbox = Backbone.View.extend({
		template: "app/templates/sandbox/sandbox",

		beforeRender: function () {
			var conf ={
				key: "the big key"
			};
			this.insertView(new Common.Views.Instructions({
				model: new Sandbox.Instructions(null, { config: conf })
			}));
		}
	});

	return Sandbox;
});