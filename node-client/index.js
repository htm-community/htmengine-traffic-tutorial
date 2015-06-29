var path = require('path')
  , express = require('express')
  , moment = require('moment')

  , buildStaticSite = require('./lib/site-builder')
  , TrafficDataClient = require('./lib/traffic-data-client')
  , TrafficPusher = require('./lib/traffic-pusher')
  , HtmEngineClient = require('./lib/htm-engine-client')
  , ajaxInitializer = require('./lib/ajax-data-handler')
  , config = require('./conf/config')
  
  , htmEngineServerUri = 'http://localhost:8080'
  , dataServerUri = config.dataServer
  
  , trafficDataClient
  , htmEngineClient
  , trafficPusher
  , app = express()
  , interval = config.interval.split(/\s+/)
  ;

interval = moment.duration(parseInt(interval.shift()), interval.shift());

trafficDataClient = new TrafficDataClient(dataServerUri);
htmEngineClient = new HtmEngineClient(htmEngineServerUri);

trafficPusher = new TrafficPusher({
    trafficDataClient: trafficDataClient
  , htmEngineClient: htmEngineClient
});

trafficPusher.init(function(err, pathIds) {
    if (err) throw err;

    trafficPusher.start(interval.asMilliseconds());
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
