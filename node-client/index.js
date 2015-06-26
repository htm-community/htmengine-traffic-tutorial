var path = require('path')
  , _ = require('lodash')
  , DataClient = require('./lib/data-client')
  , TrafficPusher = require('./lib/traffic-pusher')
  , localMarkerFile = path.join(__dirname, 'conf', 'markers.json')
  , htmEngineServerUri = 'http://localhost:8080'
  , dataServerUri = 'http://sheltered-oasis-4180.herokuapp.com'
  // , dataServerUri = 'http://localhost:8081'
  , dataClient
  , trafficPusher
  , trafficPushInterval = 60000
  ;

dataClient = new DataClient(dataServerUri);
trafficPusher = new TrafficPusher({
    dataClient: dataClient
  , markerFile: localMarkerFile
  , htmEngineServer: htmEngineServerUri
  , interval: trafficPushInterval
});

trafficPusher.init(function(err) {
    if (err) throw err;

    trafficPusher.createTrafficModels(function(err, responses) {
        var modelCreatedResponses;
        if (err) throw err;
        modelCreatedResponses = _.filter(responses, function(resp) {
            console.log(_.trim(resp[1]));
            return resp[0].statusCode == 201;
        });
        console.log('%s Models created.', modelCreatedResponses.length);
        console.log('Starting traffic data polling...');
        trafficPusher.start(function() {
            // Node server is now running and polling the Travic data service every
            // minute for new data and posting it to HTM Engine web server.
            console.log('Traffic Pusher is running every %sms', trafficPusher.interval);
        });
    });


});
