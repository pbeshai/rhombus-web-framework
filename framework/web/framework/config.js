// Set the require.js configuration for your application.
require.config({
  packages: [
    {
      "name": "backbone",
      "location": "../vendor/backbone",
      "main": "backbone.js"
    },
    {
      "name": "jquery",
      "location": "../vendor/jquery",
      "main": "jquery.js"
    },
    {
      "name": "lodash",
      "location": "../vendor/lodash",
      "main": "./dist/lodash.compat.js"
    },
    {
      "name": "underscore",
      "location": "../vendor/underscore",
      "main": "underscore.js"
    }
  ],

  paths: {
    // Use the underscore build of Lo-Dash to minimize incompatibilities.
    "lodash": "../vendor/lodash/dist/lodash.underscore",

    "d3": "../vendor/d3/d3.v2",

    // JavaScript folders.
    "vendor": "../vendor",

    "app": "../app",

    "App": "../framework/App",
    "framework": "../framework"
  },

  map: {
    // Ensure Lo-Dash is used instead of underscore.
    "*": { "underscore": "lodash" }

    // Put additional maps here.
  },

  shim: {
    "backbone": {
      "deps": [
        "underscore",
        "jquery"
      ],
      "exports": "Backbone"
    },
    "backbone/backbone.layoutmanager": {
      "deps": [
        "jquery",
        "backbone",
        "underscore"
      ],
      "exports": "Backbone.LayoutManager"
    },
    "underscore": {
      "exports": "_"
    },

    // Backbone.CollectionCache depends on Backbone.
    "backbone/collectioncache": ["backbone"],

    // Twitter Bootstrap depends on jQuery.
    "vendor/bootstrap/js/bootstrap": ["jquery"],

    "d3": {
      exports: 'd3'
    },

    "vendor/d3/d3.layout": ["d3"],

    "vendor/d3/rickshaw": {
      deps: ['d3', 'vendor/d3/d3.layout'],
      exports: 'Rickshaw'
    }
  },
});