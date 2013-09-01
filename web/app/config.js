require.config({
	// add the framework config and run main
	deps: ["/framework/config.js"],
	callback: function () {
		// load the main app after configs are loaded
		require(["app/main"]);
	}
});