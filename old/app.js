/**
 * Module dependencies.
 */
var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server)
  , path = require('path')
  , websocketHandler = require('./websocket_handler');

// all environments
app.set('port', process.env.PORT || 80);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(require('less-middleware')({ src: __dirname + '/public' }));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// start the http server
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

// initialize the websocket clicker server handler
websocketHandler.init(io);