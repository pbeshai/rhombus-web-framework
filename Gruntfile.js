// This is the main application configuration file.  It is a Grunt
// configuration file, which you can learn more about here:
// https://github.com/cowboy/grunt/blob/master/docs/configuring.md
module.exports = function(grunt) {
	var serverInit = require("./server/init");

	grunt.initConfig({
		// The jshint option for scripturl is set to lax, because the anchor
		// override inside main.js needs to test for them so as to not accidentally
		// route.
		jshint: {
			options: {
				scripturl: true,
				eqnull: true
			},

			app: [ 'web/app/**/*.js' ],

			server: {
				options: {
					node: true,
					laxcomma: true
				},
				files: { src: [ 'server/**/*.js' ] }
			},

			other: [ 'Gruntfile.js' ]
		},

		// The jst task compiles all application templates into JavaScript
		// functions with the underscore.js template function from 1.2.4.
		//
		// The concat task depends on this file to exist, so if you decide to
		// remove this, ensure concat is updated accordingly.
		jst: {
			options: {
				processName: function (name) {
					return name.substring(4); // remove web/
				}
			},

			"dist/debug/templates.js": [
				"web/app/templates/**/*.html"
			]
		},

		// This task simplifies working with CSS inside Backbone Boilerplate
		// projects.  Instead of manually specifying your stylesheets inside the
		// configuration, you can use `@imports` and this task will concatenate
		// only those paths.
		styles: {
			// Out the concatenated contents of the following styles into the below
			// development file path.
			"dist/debug/index.css": {
				// Point this to where your `index.css` file is location.
				src: "web/app/styles/index.css",

				// The relative path to use for the @imports.
				paths: ["web/app/styles"],

				// Point to where styles live.
				prefix: "web/app/styles/",

				// Additional production-only stylesheets here.
				additional: []
			}
		},

		// This task uses James Burke's excellent r.js AMD build tool.  In the
		// future other builders may be contributed as drop-in alternatives.
		requirejs: {
			compile: {
				options: {
					// Include the main configuration file.
					mainConfigFile: "web/app/config.js",

					// Output file.
					out: "dist/debug/require.js",

					// Root application module.
					name: "config",

					// Do not wrap everything in an IIFE.
					wrap: false,

					// do not do any uglification yet
					optimize: "none"
				}
			}

		},

		// The concatenate task is used here to merge the almond require/define
		// shim and the templates into the application code.  It's named
		// dist/debug/require.js, because we want to only load one script file in
		// index.html.
		concat: {
			dist: {
				src: [
					"web/vendor/almond.js",
					"dist/debug/templates.js",
					"dist/debug/require.js"
				],

				dest: "dist/debug/require.js",

				separator: ";"
			}
		},

		// This task uses the MinCSS Node.js project to take all your CSS files in
		// order and concatenate them into a single CSS file named index.css.  It
		// also minifies all the CSS as well.  This is named index.css, because we
		// only want to load one stylesheet in index.html.
		cssmin: {
			"dist/release/index.css": [
				"dist/debug/index.css"
			]
		},

		// Takes the built require.js file and minifies it for filesize benefits.
		uglify: {
			options: {
				beautify: true,
				ascii_only: true,
				max_line_length: 1000,
			},

			"dist/release/require.js": [
				"dist/debug/require.js"
			]
		},

		// Running the server without specifying an action will run the defaults,
		// port: 8000 and host: 127.0.0.1.  If you would like to change these
		// defaults, simply add in the properties `port` and `host` respectively.
		// Alternatively you can omit the port and host properties and the server
		// task will instead default to process.env.PORT or process.env.HOST.
		"socket-server": {
			options: {
				// function to do extra initialization before starting web server
				webInit: serverInit.webInit,

				// function to do extra initialization after listening with websocket
				webSocketInit: serverInit.webSocketInit
			},

			dev: {
				options: {
					port: 8000,

					// crash on warnings
					force: false,

					// show stack trace on errors/warnings
					stack: true,
				}
			},

			debug: {
				options: {
					port: 8000,

					// crash on warnings
					force: false,

					// show stack trace on errors/warnings
					stack: true,

					map: {
						"app": "dist/debug",
						"vendor": "dist/debug",
						"app/styles": "dist/debug"
					},

					index: "dist/debug/index.html"
				},
			},

			release: {
				options: {
					// This makes it easier for deploying, by defaulting to any IP.
					host: "0.0.0.0",

					map: {
						"app": "dist/release",
						"vendor": "dist/release",
						"app/styles": "dist/release"
					},

					index: "dist/release/index.html"
				}
			}
		},

		// The headless QUnit testing environment is provided for "free" by Grunt.
		// Simply point the configuration to your test directory.
		qunit: {
			all: ["test/qunit/*.html"]
		},

		// The watch task can be used to monitor the filesystem and execute
		// specific tasks when files are modified.  By default, the watch task is
		// available to compile CSS if you are unable to use the runtime compiler
		// (use if you have a custom server, PhoneGap, Adobe Air, etc.)
		watch: {
			files: ["Gruntfile.js", "web/**/*"],
			tasks: "styles"
		},

		// The clean task ensures all files are removed from the dist/ directory so
		// that no files linger from previous builds.
		clean: ["dist/"],

		// This task will copy assets into your build directory,
		// automatically.  This makes an entirely encapsulated build into
		// each directory.
		copy: {
			debug: {
				files: [
					{ expand: true, flatten: true, src: ['web/*'], dest: 'dist/debug/', filter: 'isFile' },
					{ expand: true, flatten: true, src: ['web/vendor/bootstrap/img/*'], dest: 'dist/debug/img/', filter: 'isFile' },
				],
			},

			release: {
				files: [
					{ expand: true, flatten: true, src: ['web/*'], dest: 'dist/release/', filter: 'isFile' },
					{ expand: true, flatten: true, src: ['web/vendor/bootstrap/img/*'], dest: 'dist/debug/img/', filter: 'isFile' },
				],
			}
		}

	});

	grunt.loadTasks("tasks"); // load the socketserver task

	grunt.loadNpmTasks('grunt-contrib');
	grunt.loadNpmTasks('grunt-bbb-styles');

	grunt.registerTask("default", ["jshint", "socket-server:dev"]);

	grunt.registerTask("dev", "socket-server:dev");

	// The debug task will remove all contents inside the dist/ folder, lint
	// all your code, precompile all the underscore templates into
	// dist/debug/templates.js, compile all the application code into
	// dist/debug/require.js, and then concatenate the require/define shim
	// almond.js and dist/debug/templates.js into the require.js file.
	grunt.registerTask("debug", ["clean", "copy:debug", "jshint", "jst", "requirejs", "concat", "styles"]);

	// The release task will run the debug tasks and then minify the
	// dist/debug/require.js file and CSS files.
	grunt.registerTask("release", ["debug", "copy:release", "cssmin", "uglify"]);

};
