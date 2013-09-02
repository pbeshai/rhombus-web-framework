define([
	"vendor/d3/rickshaw",

	"framework/util/d3/rickshaw/timeseriesTooltip"
],

function (Rickshaw, TimeseriesTooltip) {
	var Graphs = {};

	Graphs.createTimeSeries = function (view, options) {
		options = options || {};

		var graphDefaults = {
			element: view.$(".chart")[0],
			width: 800,
			height: 300,
			renderer: 'line',
			padding: { top: 0.1 }
			/* series: [] */
		};


		var graph = new Rickshaw.Graph(_.extend(graphDefaults, options.graph));
		graph.render();

		var xAxisDefaults = {
			graph: graph,
			orientation: "bottom",
			element: view.$(".x-axis")[0]
		};
		console.log("configuring with ", _.extend(xAxisDefaults, options.xAxis));
		var xAxis = new Rickshaw.Graph.Axis.X(_.extend(xAxisDefaults, options.xAxis));
		xAxis.render();

		var yAxisDefaults = {
			graph: graph,
			orientation: "left",
			element: view.$(".y-axis")[0],
			tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
		};

		var yAxis = new Rickshaw.Graph.Axis.Y(_.extend(yAxisDefaults, options.yAxis));
		yAxis.render();

		var hoverDefaults = {
			graph: graph
		};
		var hover = new TimeseriesTooltip(_.extend(hoverDefaults, options.hover));

		return { graph: graph, xAxis: xAxis, yAxis: yAxis, hover: hover };
	};

	return Graphs;
});