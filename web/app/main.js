require([
  "framework/main",

  // Application.
  "App",

  "apps/Apps"
],

function (frameworkMain, App, Apps) {
  // load user applications
	App.registerApplications(Apps);

	if (frameworkMain) {
		frameworkMain();
	}
});
