var ClickerUtils = (function () {
	"use strict"

	/**
	 *  The toolbar contains connect, enable clicks, and fullscreen button. Fullscreen defaults to $("#fullscreen-container")
	 */
	var installToolbar = function ($toolbar) {
			$toolbar.addClass("clicker-toolbar");

			var $connect = $("<button class='btn btn-primary'>Connect</button>");
			var $enableClicks = $("<button class='btn disabled' disabled>Enable Clicks</button>");
			var $fullScreen = $("<button class='btn'>Full Screen</button>");

			$toolbar.append($connect, $enableClicks);
			connect($connect);
			enableClicks($enableClicks);

			// only add fullscreen button if we have an elem with id fullscreen-container
			if ($("#fullscreen-container").length) {
				$toolbar.append($fullScreen);
				fullScreen($fullScreen);
			}
		}

	// click listener for a connect/disconnect buttton
	, connect = function ($button) {
			$button.csToggleButton({
				clickState1: ClickerServer.connect,
				clickState2: ClickerServer.disconnect,
				textState1: "Connect",
				textState2: "Disconnect",
				state1To2Event: "connect",
				state2To1Event: "disconnect"
			});
		}

	, enableClicks = function ($button) {
	  	$button.csToggleButton({
				clickState1: ClickerServer.enableClicks,
				clickState2: ClickerServer.disableClicks,
				textState1: "Enable Clicks",
				textState2: "Disable Clicks",
				state1To2Event: "enable-clicks",
				state2To1Event: "disable-clicks",
				classState1: "btn-success",
				classState2: "btn-danger"
			});

			ClickerServer.on("status", function (state) {
				if (state.acceptingVotes) {
					$button.trigger("state2");
				} else {
					$button.trigger("state1");
				}
			});

			ClickerServer.on("connect", function (success) {
				if (success) {
					// check the status to see if voting is currently enabled or disabled

					$button.removeClass("disabled").prop("disabled", false);

				}
			});
			ClickerServer.on("disconnect", function (success) {
				if (success) {
					$button.addClass("disabled").prop("disabled", true);
				}
			});
	  }

	,  fullScreen = function ($button, $fullScreenElement) {
			$fullScreenElement = $fullScreenElement || $("#fullscreen-container");

			$button.on("click", function () {
		  	$fullScreenElement.requestFullScreen();
		  });
		};



	return {
		installToolbar: installToolbar,
		connect: connect,
		enableClicks: enableClicks,
		fullScreen: fullScreen
	};
}());