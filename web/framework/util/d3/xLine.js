// d3 utility for drawing a line parallel to an x-axis and showing its label
define(["d3"],
function () {
	"use strict";

	var xLine = function () {
		var yValue = function (d) {
			return d;
		};

		var width = 100;

		function chart(selection) {
			selection.each(function (data) {
				var g = d3.select(this).selectAll(".x-line")
					.data(data).enter().insert("g", ":first-child") // prepend so it is behind bars
						.attr("class", "x-line")
						.attr("transform", function (d) { return "translate(0," + yValue(d) +")"; });

				g.append("line")
					.attr("x2", width);

				g.append("text")
					.attr("x", width)
					.attr("dy", "-.5ex")
					.text(function (d) { return d.toFixed(1); });
			});
		}

		chart.y = function (_) {
			if (!arguments.length) return yValue;
			yValue = _;
			return chart;
		};

		chart.width = function (_) {
			if (!arguments.length) return width;
			width = _;
			return chart;
		};

		return chart;
	};

	return xLine;

});