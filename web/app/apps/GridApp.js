/**

	Simple App for testing. Goes from Attendance -> Grid view.

*/
define([
	// Application.
	"App",

	"framework/apps/StateApp",

	"framework/modules/Participant",
	"framework/modules/Attendance",
	"framework/modules/Grid"
],

function (App, StateApp, Participant, Attendance, Grid) {

	/**
	 *  Grid App
	 */
	var GridApp = StateApp.App.extend({
		id: "grid",
		defineStates: function () {
			console.log("define states");
			var attendanceState = new Attendance.State({
				participants: this.get("participants"),
				acceptNew: true
			});
			var gridState = new Grid.State({
				participants: this.get("participants")
			});

			this.states = {
				"attendance": attendanceState,
				"grid": gridState
			};

			attendanceState.setNext(gridState);
		},

		transitions: {
			attendance_grid: function () {
				console.log("going from attendance to grid");
			},

			grid_attendance: function () {
				console.log("going from grid to attendance");
				this.options.participants.fetch();
			}
		}
	});

	// description for use in router
	GridApp.app = {
		instantiate: function (attrs) {
			return new GridApp(attrs, { writeLogAtEnd: false });
		},
		AppControlsView: undefined,
		title: "Grid App"
	};

	return GridApp;
});