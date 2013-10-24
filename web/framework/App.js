define([
	"framework/base/BaseView",
	"jquery",
	"backbone/backbone.layoutmanager",
	"d3"
], function (BaseView) {
	var io = window.io;

	var frameworkTemplatePrefix = "framework/templates/";
	// Provide a global location to place configuration settings and module
	// creation.
	var App = {
		socketUrl: window.location.origin,
		// The root path to run the application.
		root: "/",
		BaseView: BaseView, // shortcut to BaseView class

		// quick hack to only show instructions
		showOnlyInstructions: function (enable) {
			if (enable === undefined) {
				enable = true;
			}
			if (enable) {
				$(document.body).append("<style id=\"only-instructions-style\">.participants,.pre-participants,.post-participants,.groups,.pre-header,.layout-header,.post-groups,.pre-groups,.no-participants { display: none; }</style>")
			} else {
				$("#only-instructions-style").remove();
			}
		},

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

		setMainView: function (view, render, appClass) {
			render = (render === undefined) ? true : render;

			App.layout.setViews({
				"#main-content": view
			});

			if (render) {
				App.layout.render();
			}

			// add in some namespacing for easier styling
			// remove app-* classes from the body
			var currClass = $(document.body).attr("class") || "";
			namespaceClass = _.reject(currClass.split(" "), function (clazz) { return clazz.indexOf("app-") === 0; }).join(" ");
			if (appClass) {
				// use the namespace and remove any spaces or periods
				appClass = appClass.substring(0,appClass.indexOf(":")).replace(/[ \.]/g,'');
				if (appClass) {
					appClass = "app-" + appClass;
					namespaceClass += " " + appClass;
				}
			}
			if (namespaceClass) {
				$(document.body).attr('class', $.trim(namespaceClass));
			} else {
				$(document.body).removeAttr('class');
			}


		},

		getMainView: function () {
			return App.layout.getView("#main-content");
		},

		registerApplications: function (apps) {
			App.apps = _.extend(App.apps || {}, apps);
		}
	};

	// Localize or create a new JavaScript Template object.
	var JST = window.JST = window.JST || {};



	// Configure LayoutManager with Backbone Boilerplate defaults.
	Backbone.Layout.configure({
		// Allow LayoutManager to augment App.BaseView.prototype.
		manage: true,

		// due to overriding views and confusion between framework views and app views
		// prefixes are no longer used.
		// prefix: "app/templates/",

		fetch: function (path) {
			// Concatenate the file extension.
			path = path + ".html";

			// If cached, use the compiled template.
			if (JST[path]) {
				return JST[path];
			}

			// Put fetch into `async-mode`.
			var done = this.async();

			// Seek out the template asynchronously.
			$.get(App.root + path, function (contents) {
				done(JST[path] = _.template(contents));
			});
		}
	});

	// Mix Backbone.Events, modules, and layout management into the app object.
	return _.extend(App, {

		// Create a custom object with a nested Views object.
		module: function (additionalProps) {
			return _.extend({ Views: {} }, additionalProps);
		},

		// Helper for using layouts.
		useLayout: function (name, options) {
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
				prefix: frameworkTemplatePrefix,
				el: "#main",
				serialize: function () {
					return App.model.attributes;
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
