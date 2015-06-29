var path = require('path')
  , express = require('express')

  , buildStaticSite = require('./lib/site-builder')
  , TrafficDataClient = require('./lib/traffic-data-client')
  , TrafficPusher = require('./lib/traffic-pusher')
  , HtmEngineClient = require('./lib/htm-engine-client')
  , MarkerManager = require('./lib/marker-manager')
  , ajaxInitializer = require('./lib/ajax-data-handler')
  , config = require('./conf/config')
  
  , localMarkerFile = path.join(__dirname, 'conf', 'markers.json')
  , htmEngineServerUri = 'http://localhost:8080'
  , dataServerUri = 'http://sheltered-oasis-4180.herokuapp.com'
  // , dataServerUri = 'http://localhost:8081'
  
  , trafficDataClient
  , htmEngineClient
  , trafficPusher
  , app = express()
  , FETCH_INTERVAL = 10000
  ;

trafficDataClient = new TrafficDataClient(dataServerUri);
htmEngineClient = new HtmEngineClient(htmEngineServerUri);

trafficPusher = new TrafficPusher({
    trafficDataClient: trafficDataClient
  , htmEngineClient: htmEngineClient
  , markerManager: new MarkerManager(localMarkerFile)
});

trafficPusher.init(function(err, pathIds) {
    if (err) throw err;

    // trafficPusher.start(FETCH_INTERVAL);
    // Node server is now running and polling the Travic data service every
    // minute for new data and posting it to HTM Engine web server.

    buildStaticSite(pathIds);
    app.use(express.static('build'));
    app.use('/data/:pathId', ajaxInitializer(htmEngineClient));
    app.listen(config.port, function(error) {
        if (error) return console.error(error);
        console.log('%s:%s', config.host, config.port);
    });

});
