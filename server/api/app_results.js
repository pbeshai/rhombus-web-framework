module.exports = {
	initialize: initialize
};

var fs = require('fs')
	, _ = require('lodash');

function initialize(site) {
	console.log("initializing app results");
	site.post("/api/apps/pd/log", pdResults);
	site.post("/api/apps/pdm/log", pdmResults);
	site.post("/api/apps/npd/log", npdResults);
	site.post("/api/apps/teampd/log", teampdResults);
	site.post("/api/apps/ultimatum/log", ultimatumResults);
	site.post("/api/apps/ultimatum-partition/log", ultimatumPartitionedResults);
}


function z (str) { // add leading zero
	return ("0"+str).slice(-2);
}

function filenameFormat(date) {
	return date.getFullYear()+z(date.getMonth()+1)+z(date.getDate())+"_"+z(date.getHours())+z(date.getMinutes())+z(date.getSeconds());
}


function pdResults(req, res) {
	var now = new Date();
	var results = req.body.results;
	var config = req.body.config;
	var version = req.body.version;

	var stream = fs.createWriteStream("log/pd/results." + filenameFormat(now) + ".txt");

	stream.once('open', function(fd) {
		function output (str) {
			console.log(str);
			stream.write(str + "\n");
		}
		output("Prisoner's Dilemma Results (v" + version + ")");
		output(now.toString());
		if (config.message) {
			output(config.message);
		}
		if (config.scoringMatrix) {
			output("CC," + config.scoringMatrix.CC + ",CD," + config.scoringMatrix.CD);
			output("DC," + config.scoringMatrix.DC + ",DD," + config.scoringMatrix.DD);
		}

	  output("Alias,Choice,Payoff,PartnerAlias,PartnerChoice,PartnerPayoff");
	  _.each(results, function (result) {
			output(result.alias + "," + result.choice + "," + result.score + "," + result.partner.alias + "," + result.partner.choice + "," + result.partner.score);
		});
	  stream.end();
	});
	res.send(200);
}

function pdmResults(req, res) {
	var now = new Date();
	var config = req.body.config;
	var version = req.body.version;
	var round = req.body.round;

	var stream = fs.createWriteStream("log/pdm/results." + filenameFormat(now) + ".txt");
	stream.once('open', function(fd) {
		function output (str) {
			console.log(str);
			stream.write(str + "\n");
		}
		output("Multiround Prisoner's Dilemma Results (v" + version + ")");
		output(now.toString());

		if (config.message) {
			output(config.message);
		}
		if (config.scoringMatrix) {
			output("CC," + config.scoringMatrix.CC + ",CD," + config.scoringMatrix.CD);
			output("DC," + config.scoringMatrix.DC + ",DD," + config.scoringMatrix.DD);
		}

		output(config.numRounds + " rounds (range was " + config.minRounds + "-" + config.maxRounds +")");
		var r, header = "Alias,PartnerAlias";
		for (r = 1; r <= config.numRounds; r++) {
			header += ",Round" + r + "Choice,Round" + r + "Payoff";
		}
	  output(header);

	  // for each participant, output choices and scores from each round
	  _.each(req.body.round1, function (participant, i) {
	  	var roundData, data = participant.alias + "," + participant.partner.alias;

	  	for (r = 1; r <= config.numRounds; r++) {
	  		roundData = req.body["round" + r];
	  		data += "," + roundData[i].choice + "," + roundData[i].score;
  		}

  		output(data);
	  });

	  stream.end();
	});

	res.send(200);
}

function npdResults(req, res) {
	var now = new Date();
	var results = req.body.results;
	var config = req.body.config;
	var version = req.body.version;
	var payoff = req.body.payoff;
	var N = (payoff !== undefined) ? (parseInt(payoff.numCooperators) + parseInt(payoff.numDefectors)) : 0;

	var stream = fs.createWriteStream("log/npd/results." + filenameFormat(now) + ".txt");
	stream.once('open', function(fd) {
		function output (str) {
			console.log(str);
			stream.write(str + "\n");
		}
		output("N-Person Prisoner's Dilemma Results (v" + version + ")");
		output(now.toString());
		if (config.message) {
			output(config.message);
		}
		if (config.Rratio) {
			output("Rratio," + config.Rratio + ",R,"+ (config.Rratio*(N-1)).toFixed(2));
		}
		if (config.H) {
			output("H," + config.H);
		}

    if (payoff) {
    	output("N," + N);
    	output("Cooperator Payoff," + payoff.cooperatorPayoff + ",# Cooperators," + payoff.numCooperators);
    	output("Defector Payoff," + payoff.defectorPayoff + ",# Defectors," + payoff.numDefectors);
    	output("Total Payoff," + payoff.totalPayoff);
    	output("Max Possible Total Payoff," + payoff.maxPayoff);
    }

	  output("Alias,Choice,Payoff");
	  _.each(results, function (result) {
			output(result.alias + "," + result.choice + "," + result.score);
		});
	  stream.end();
	});

	res.send(200);
}

function teampdResults(req, res) {
	var now = new Date();
	var results = req.body.results;
	var config = req.body.config;
	var version = req.body.version;

	var stream = fs.createWriteStream("log/teampd/results." + filenameFormat(now) + ".txt");
	stream.once('open', function(fd) {
		function output (str) {
			console.log(str);
			stream.write(str + "\n");
		}
		output("Team Prisoner's Dilemma Results (v" + version + ")");
		output(now.toString());
		if (config.message) {
			output(config.message);
		}
		if (config.scoringMatrix) {
			output("CC," + config.scoringMatrix.CC + ",CD," + config.scoringMatrix.CD);
			output("DC," + config.scoringMatrix.DC + ",DD," + config.scoringMatrix.DD);
		}

		output("Team 1 (" + config.group1Name + ") vs. Team 2 (" + config.group2Name + ")");
		output("");

		output("Team 1 (" + config.group1Name + ") Results");
	  output("Alias,Choice,Payoff,PartnerAlias,PartnerChoice,PartnerPayoff");
	  _.each(results.team1, function (result) {
			output(result.alias + "," + result.choice + "," + result.score + "," + result.partner.alias + "," + result.partner.choice + "," + result.partner.score);
		});

	  output("");
		output("Team 2 (" + config.group2Name + ") Results");
	  output("Alias,Choice,Payoff,PartnerAlias,PartnerChoice,PartnerPayoff");
	  _.each(results.team2, function (result) {
			output(result.alias + "," + result.choice + "," + result.score + "," + result.partner.alias + "," + result.partner.choice + "," + result.partner.score);
		});
	  stream.end();
	});

	res.send(200);
}

function ultimatumResults(req, res) {
	var now = new Date();
	var results = req.body.results;
	var config = req.body.config;
	var version = req.body.version;

	var stream = fs.createWriteStream("log/ultimatum/results." + filenameFormat(now) + ".txt");
	stream.once('open', function(fd) {
		function output (str) {
			console.log(str);
			stream.write(str + "\n");
		}
		output("Ultimatum Game Results (v" + version + ")");
		output(now.toString());
		if (config.message) {
			output(config.message);
		}
		output("Total Amount," + config.amount);
		output("Offer Map," + _.map(_.keys(config.offerMap), function (key) { return key + ":" + config.offerMap[key]; }).join(","));
		output("")

	  output("Alias,GiverOffer,GiverScore,GiverPartner,ReceiverOffer,ReceiverScore,ReceiverPartner");
	  _.each(results, function (result) {
			output(result.alias + "," + result.giverOffer + "," + result.giverScore + "," + result.giverPartner
				+ "," + result.receiverOffer + "," + result.receiverScore + "," + result.receiverPartner);
		});
	  stream.end();
	});

	res.send(200);
}

function ultimatumPartitionedResults(req, res) {
	var now = new Date();
	var results = req.body.results;
	var config = req.body.config;
	var version = req.body.version;

	var stream = fs.createWriteStream("log/ultimatum-partitioned/results." + filenameFormat(now) + ".txt");
	stream.once('open', function(fd) {
		function output (str) {
			console.log(str);
			stream.write(str + "\n");
		}
		output("Ultimatum Game (Partitioned) Results (v" + version + ")");
		output(now.toString());
		if (config.message) {
			output(config.message);
		}
		output("Total Amount," + config.amount);
		output("Offer Map," + _.map(_.keys(config.offerMap), function (key) { return key + ":" + config.offerMap[key]; }).join(","));
		output("");

		output("Givers");
	  output("Alias,AmountToKeep,Score,Partner");
	  _.each(results.givers, function (result) {
			output(result.alias + "," + result.keep + "," + result.score + "," + result.partner);
		});

	  output("");
		output("Receivers");
	  output("Alias,Offer,Score,Partner");
	  _.each(results.receivers, function (result) {
			output(result.alias + "," + result.offer + "," + result.score + "," + result.partner);
		});
	  stream.end();
	});

	res.send(200);
}

