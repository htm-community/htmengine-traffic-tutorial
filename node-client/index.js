
var path = require('path'),
    express = require('express'),
    moment = require('moment'),
    _ = require('lodash'),
    buildStaticSite = require('./lib/site-builder'),
    TrafficDataClient = require('./lib/traffic-data-client'),
    TrafficPusher = require('./lib/traffic-pusher'),
    HtmEngineClient = require('./lib/htm-engine-client'),
    ajaxInitializer = require('./lib/ajax-data-handler'),
    config = require('./conf/config'),
    htmEngineServerUrl = config.htmEngineServerUrl,
    riverViewUrl = config.riverViewUrl,
    riverName = config.riverName,
    ajaxRequestHandlers,
    trafficDataClient,
    htmEngineClient,
    trafficPusher,
    app = express(),
    interval = config.interval.split(/\s+/),
    pathWhitelist = config.pathWhitelist;

if (! process.env['GOOGLE_MAPS_API_KEY']) {
    console.warn('Expected Google Maps API key to be set into ' +
                 'environment variable "GOOGLE_MAPS_API_KEY". ' +
                 'You won\'t be able to see any maps. That\'s too bad. :( )');
}

// Convert the interval from strings to momentjs duration.
interval = moment.duration(parseInt(interval.shift()), interval.shift());

// The thing that interfaces with River View.
trafficDataClient = new TrafficDataClient(riverViewUrl, riverName);

// The thing that interfaces with the HTM Engine HTTP API.
htmEngineClient = new HtmEngineClient(htmEngineServerUrl);

// The thing that fetches traffic data and pushes it into HTM Engine.
trafficPusher = new TrafficPusher({
    trafficDataClient: trafficDataClient,
    htmEngineClient: htmEngineClient
});

// The TrafficPusher must be initialized so it can gather all the traffic paths
// it will be monitoring. Returns all the path ids and details to the callback.
trafficPusher.init(pathWhitelist, function(err, pathIds, pathDetails) {
    // This will be a list of all path data available at startup, including all
    // additional information we might want to add to them for local static
    // templates.
    var allPathDetails = [];

    if (err) throw err;

    // The traffic pusher does all the data transfer in the background.
    // If you comment this line out, the web server will still run, but no new
    // traffic data will be fetched and pushed to the HTM Engine.
    trafficPusher.start(interval.asMilliseconds());

    // Creates all the request handling functions that will be mapped to URL
    // routes below to handle AJAX requests coming from the browser.
    ajaxRequestHandlers = ajaxInitializer(
        htmEngineClient, trafficDataClient, pathIds, pathDetails
    );

    // Prep some template data for the static site.
    _.each(pathIds, function(id) {
        // Add an id to each.
        pathDetails[id].id = id;
        allPathDetails.push(pathDetails[id]);
    });

    // This builds out a complete static file structure for the webapp and puts
    // it in /build. This includes all pre-rendered HTML templates, js, css,
    // etc.
    buildStaticSite(allPathDetails, riverViewUrl, htmEngineServerUrl);
    // Telling express where the static files are.
    app.use(express.static('build'));

    // The following are AJAX URLs that the browser will be calling to get more
    // data when rendering charts, maps, and tables.

    // These three routes are sortof experimental and CPU intensive.
    app.use('/data/anomalies', ajaxRequestHandlers.getAllAnomalies);
    app.use('/data/anomalyAverage', ajaxRequestHandlers.getAnomalyAverage);
    app.use('/data/anomalyAbove', ajaxRequestHandlers.getPathsWithAnomaliesAbove);
    // Gets all path details for all paths.
    app.use('/data/pathDetails', ajaxRequestHandlers.getPathDetails);
    // Gets all data for one path.
    app.use('/data/:pathId', ajaxRequestHandlers.getPathData);

    // Turn on the web UI!
    app.listen(config.port, function(error) {
        if (error) return console.error(error);
        console.log('%s:%s', config.host, config.port);
    });

});
