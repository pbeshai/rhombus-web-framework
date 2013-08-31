/**

	Simple App for testing. Goes from Attendance -> Grid view.

*/
define([
	// Application.
	"app",

	"apps/StateApp",

	"modules/Participant",
	"modules/Attendance",
	"modules/Grid"
],

function(app, StateApp, Participant, Attendance, Grid) {

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