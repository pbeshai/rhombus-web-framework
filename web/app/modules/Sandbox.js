/**

	A place to test things.

*/
define([
	// Application.
	"app",
	"modules/common/Common",
	"vendor/d3/rickshaw",
	"util/d3/rickshaw/graphs"
],

function (app, Common, Rickshaw, Graphs) {

	var Sandbox = app.module();

	Sandbox.Instructions = Common.Models.Instructions.extend({
		configInit: function (config) {
			this.attributes.description = "DESC" + config.key;
			this.attributes.buttonConfig = {
				B: { description: "testing " + config.key}
			};
		}
	});

	Sandbox.Views.Sandbox = Backbone.View.extend({
		template: "sandbox/sandbox",

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