var path = require('path')
  , TrafficDataClient = require('./lib/traffic-data-client')
  , TrafficPusher = require('./lib/traffic-pusher')
  , HtmEngineClient = require('./lib/htm-engine-client')
  , MarkerManager = require('./lib/marker-manager')
  , localMarkerFile = path.join(__dirname, 'conf', 'markers.json')
  , htmEngineServerUri = 'http://localhost:8080'
  , dataServerUri = 'http://sheltered-oasis-4180.herokuapp.com'
  // , dataServerUri = 'http://localhost:8081'
  , trafficDataClient
  , htmEngineClient
  , trafficPusher
  , FETCH_INTERVAL = 10000
  ;

trafficDataClient = new TrafficDataClient(dataServerUri);
htmEngineClient = new HtmEngineClient(htmEngineServerUri);

trafficPusher = new TrafficPusher({
    trafficDataClient: trafficDataClient
  , htmEngineClient: htmEngineClient
  , markerManager: new MarkerManager(localMarkerFile)
});

trafficPusher.init(function(err) {
    if (err) throw err;

    trafficPusher.start(FETCH_INTERVAL);
    // Node server is now running and polling the Travic data service every
    // minute for new data and posting it to HTM Engine web server.

});
