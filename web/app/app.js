define([
	"base/BaseView",
	"jquery",
	"backbone/backbone.layoutmanager",
	"d3"
], function(BaseView) {
	var io = window.io;


	// Provide a global location to place configuration settings and module
	// creation.
	var app = {
		socketUrl: "http://localhost",
		// The root path to run the application.
		root: "/",
		BaseView: BaseView, // shortcut to BaseView class

		instructorFocus: false,

		model: new Backbone.Model({ browserId: "", screenName: "" }),

		views: {}, // all views can register themselves here
		registerView: function (name, view) {
			if (this.views[name] !== undefined) {
				console.log("Warning! Redefining view with " + name);
			}
			this.views[name] = view;

			return view;
		},

		setMainView: function (view, render) {
			render = (render === undefined) ? true : render;

			app.layout.setViews({
				"#main-content": view
			});

			if (render) {
				app.layout.render();
			}
		},

		getMainView: function () {
			return app.layout.getView("#main-content");
		}
	};

	// Localize or create a new JavaScript Template object.
	var JST = window.JST = window.JST || {};



	// Configure LayoutManager with Backbone Boilerplate defaults.
	Backbone.Layout.configure({
		// Allow LayoutManager to augment Backbone.View.prototype.
		manage: true,

		prefix: "app/templates/",

		fetch: function(path) {
			// Concatenate the file extension.
			path = path + ".html";

			// If cached, use the compiled template.
			if (JST[path]) {
				return JST[path];
			}

			// Put fetch into `async-mode`.
			var done = this.async();

			// Seek out the template asynchronously.
			$.get(app.root + path, function(contents) {
				done(JST[path] = _.template(contents));
			});
		}
	});

	// Mix Backbone.Events, modules, and layout management into the app object.
	return _.extend(app, {

		// Create a custom object with a nested Views object.
		module: function(additionalProps) {
			return _.extend({ Views: {} }, additionalProps);
		},

		// Helper for using layouts.
		useLayout: function(name, options) {
			// Enable variable arity by allowing the first argument to be the options
			// object and omitting the name argument.
			if (_.isObject(name)) {
				options = name;
			}

			// Ensure options is an object.
			options = options || {};

			// If a name property was specified use that as the template.
			if (_.isString(name)) {
				options.template = name;
			}

			// Create a new Layout with options.
			var layout = new Backbone.Layout(_.extend({
				el: "#main",
				serialize: function () {
					return app.model.attributes;
				}
			}, options));

			// Cache the refererence.
			this.layout = layout;
			return layout;
		},

		setTitle: function (subtitle) {
			var title = "Clicker Testing";
			if (!_.isEmpty(subtitle)) {
				title = subtitle + " - " + title;
			}
			document.title = title;
		},

		// make an API call
		api: function (options) {
			$.ajax({
				url: "/api/" + options.call,
				type: options.type || "GET",
				data: options.data,
				success: options.success,
				error: options.error
			});
		}
	}, Backbone.Events);

});
