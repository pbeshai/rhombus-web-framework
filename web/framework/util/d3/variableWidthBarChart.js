// design inspired by http://bost.ocks.org/mike/chart/
define(["d3"],
function () {
	"use strict";

	var variableWidthBarChart = function () {
		var margin = {top: 20, right: 20, bottom: 30, left: 40},
				width = 760,
				height = 400,
				yScalePadding = 1.05,
				xValue = function (d) { return d.label; },
				yValue = function (d) { return d.value; },
				barWidth = function (d) { return d.count; },
				xScale = d3.scale.ordinal(),
				yScale = d3.scale.linear(),
				xAxis = d3.svg.axis().scale(xScale).orient("bottom"),
				yTicks = 5,
				yAxis = d3.svg.axis().scale(yScale).orient("left").ticks(yTicks),
				tooltipTemplate = _.template("<%= value %>"),
				tooltipData;

		function chart(selection) {
			selection.each(function (data) {
				// Convert data to standard representation greedily;
				// this is needed for nondeterministic accessors.
				data = data.map(function (d, i) {
					return [xValue.call(data, d, i), yValue.call(data, d, i), barWidth.call(data, d, i)];
				});
				var maxBarWidth = d3.max(data, function (d) { return d[2]; });

				// Update the x-scale.
				xScale
						.domain(data.map(function (d) { return d[0]; }))
						.rangeRoundBands([0, innerWidth()], 0.1);

				// Update the y-scale.
				yScale
						.domain([0, yScalePadding*d3.max(data, function (d) { return d[1]; })])
						.range([innerHeight(), 0]);

				// Select the svg element, if it exists.
				var svg = d3.select(this).selectAll("svg").data([data]);


				// Otherwise, create the skeletal chart.
				var gEnter = svg.enter().append("svg").append("g").attr("class", "chart-inner");

				// Update the outer dimensions.
				svg .attr("width", width)
						.attr("height", height);

				// Update the inner dimensions.
				var g = svg.select("g")
						.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

				// draw y-axis grid lines
				g.append("g")
					.attr("class", "y grid-lines")
					.selectAll("line.y")
					.data(yScale.ticks(yTicks))
					.enter().append("line")
							.attr("class", "y")
							.attr("x1", 0)
							.attr("x2", innerWidth())
							.attr("y1", yScale)
							.attr("y2", yScale)
							.style("stroke", "#ccc");

				// draw x-axis
				g.append("g")
						.attr("class", "x axis")
						.attr("transform", "translate(0," + innerHeight() + ")")
						.call(xAxis)
					.append("line") // hide the path and draw the line so that we don't see the ugly ticks at the end
						.attr("x2", innerWidth())
						.attr("class","axis-line");

				// draw y-axis
				g.append("g")
						.attr("class", "y axis")
						.call(yAxis)
					.append("line")
						.attr("y2", innerHeight())
						.attr("class","axis-line");


				var scaleFactor = function (d) {
					return d[2] / maxBarWidth;
				};

				// draw bars (width depends on frequency)
				var gBarsEnter = g.append("g")
					.attr("class", "chart-data")
					.selectAll(".bar")
					.data(data)
					.enter();

				var gBarEnter = gBarsEnter.append("g")
						.on("mouseover", showTooltip)
						.on("mouseout", hideTooltip);

				gBarEnter.append("rect")
						.attr("class", function (d) { return "bar bar-"+ d[0]; })
						.attr("x", function (d) { return xScale(d[0]) + (xScale.rangeBand() * (1 - scaleFactor(d)))/2; })
						.attr("y", function (d) { return yScale(d[1]); })
						.attr("width", function (d) { return xScale.rangeBand() * scaleFactor(d); })
						.attr("height", function (d) { return innerHeight() - yScale(d[1]); });


				var tooltip = d3.select("body").append("div")
					.attr("class", "chart-tooltip")
					.style("opacity", 0);

				function showTooltip(d) {
					tooltip.transition()
						.duration(200)
						.style("opacity", 1);
					tooltip.html(tooltipTemplate(_.extend({ label: d[0], value: d[1], count: d[2] }, tooltipData)));
					tooltip.style("left", (d3.event.pageX) + "px");
					tooltip.style("top", (d3.event.pageY) + "px");
				}

				function hideTooltip() {
					tooltip.transition()
						.duration(350)
						.style("opacity", 0);
				}




				var textInBar = function (d) {
					var barHeight = innerHeight() - yScale(d[1]);
					return barHeight > 100;
				};

				// text outline
				var outlineOffset = { x: 0, y: 0 };
				gBarEnter.append("text")
						.attr("class", function (d) { return textInBar(d) ? "bar-value outline inside-bar" : "bar-value outline outside-bar"; })
						.attr("x", function (d) { return outlineOffset.x + xScale(d[0]) + xScale.rangeBand()/2; })
						.attr("y", function (d) { return outlineOffset.y + yScale(d[1]) + 20; })
						.attr("dy", function (d) {
							return textInBar(d) ? "1ex" : "-1.2ex";
						})
						.style("text-anchor", "middle")
						.text(function (d) { return d[1].toFixed(1); });

				// text
				gBarEnter.append("text")
						.attr("class", function (d) { return textInBar(d) ? "bar-value inside-bar" : "bar-value outside-bar"; })
						.attr("x", function (d) { return xScale(d[0]) + xScale.rangeBand()/2; })
						.attr("y", function (d) { return yScale(d[1]) + 20; })
						.attr("dy", function (d) {
							return textInBar(d) ? "1ex" : "-1.2ex";
						})
						.style("text-anchor", "middle")
						.text(function (d) { return d[1].toFixed(1); });


			});
		}

		function innerHeight() {
			return height - margin.top - margin.bottom;
		}

		function innerWidth() {
			return width - margin.left - margin.right;
		}

		chart.xScale = function (x) {
			return xScale(x);
		};

		chart.yScale = function (y) {
			return yScale(y);
		};

		chart.innerWidth = innerWidth;
		chart.innerHeight = innerHeight;

		chart.margin = function (_) {
			if (!arguments.length) return margin;
			margin = _;
			return chart;
		};

		chart.width = function (_) {
			if (!arguments.length) return width;
			width = _;
			return chart;
		};

		chart.height = function (_) {
			if (!arguments.length) return height;
			height = _;
			return chart;
		};

		chart.x = function (_) {
			if (!arguments.length) return xValue;
			xValue = _;
			return chart;
		};

		chart.y = function (_) {
			if (!arguments.length) return yValue;
			yValue = _;
			return chart;
		};

		chart.barWidth = function (_) {
			if (!arguments.length) return barWidth;
			barWidth = _;
			return chart;
		};

		chart.tooltip = function (_, data) {
			if (!arguments.length) return tooltipTemplate;
			tooltipTemplate = _;
			tooltipData = data;
			return chart;
		};

		return chart;
	};

	return variableWidthBarChart;
});