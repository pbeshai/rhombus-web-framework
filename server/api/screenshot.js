// takes a screenshot of up to 3 screens.


var util = require('util'),
    exec = require('child_process').exec,
    spawn = require("child_process").spawn,
    gm = require('gm').subClass({ imageMagick: true }),
    fs = require('fs'),
    child;

var screenFiles = [ "/tmp/screen0.png", "/tmp/screen1.png", "/tmp/screen2.png" ];
var outputFile = "screenshot.png";

// screencapture on Mac OS X (10.2+)
child = exec('screencapture -C ' + screenFiles[0] + ' ' + screenFiles[1] + ' ' + screenFiles[2], // command line argument directly in string
  function (error, stdout, stderr) {      // one easy function to capture data/errors
    if (error !== null) {
      console.log('exec error: ' + error);
      return;
    }

    // append images
    if (fs.existsSync(screenFiles[1])) {
      var appendedImg = gm(screenFiles[0]).append(screenFiles[1], true);
      if (fs.existsSync(screenFiles[2])) {
        appendedImg = appendedImg.append(screenFiles[2], true);
      }

      appendedImg.write(outputFile, function (err, stdout, stderr, command) {
        console.log("appended");
        if (err) {
          console.log(err);
        } else {
          console.log(command);
        }
      });
    } else {
      fs.rename(screenFiles[0], outputFile, function () {
        console.log("renamed", arguments);
      });
    }
});