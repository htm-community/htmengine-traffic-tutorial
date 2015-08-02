var _ = require('lodash'),
    async = require('async'),
    moment = require('moment-timezone'),
    // Traffic speeds
    MIN_SPEED = 0,
    MAX_SPEED = 80,
    // This is the max number of records to fetch when initially starting with
    // no history of data at all.
    PRIMER_LIMIT = 5000,
    // It is important to do all data processing as if we were in this time
    // zone.
    TZ = "America/New_York";

/**
 * Given a datetime string with the format "YYYY/MM/DD HH:MM:ss", convert it to
 * a unix timestamp given a timezone string.
 * @param dateTimeString String with format "YYYY/MM/DD HH:MM:ss"
 * @param timezone String like "America/New_York"
 * @returns integer UNIX timestamp
 */
function dateStringToMomentWithZone(dateTimeString, timezone) {
    // Example input: 2015/06/08 00:03:54
    var dateString = dateTimeString.split(' ').shift(),
        timeString = dateTimeString.split(' ').pop(),
        datePieces = dateString.split('/'),
        timePieces = timeString.split(':'),
        timeObject = {},
        timeOut;

    timeObject.year = parseInt(datePieces.shift());
    timeObject.month = parseInt(datePieces.shift()) - 1;
    timeObject.day = parseInt(datePieces.shift());
    timeObject.hour = parseInt(timePieces.shift());
    timeObject.minute = parseInt(timePieces.shift());
    timeObject.second = parseInt(timePieces.shift());

    timeOut = moment.tz(timeObject, timezone);

    return timeOut;
}

/**
 * This is the thing that pulls data from a given TrafficDataClient and injects
 * it into the HTM Engine through an HtmEngineClient.
 * @param config Object: should contain:
 *                 - trafficDataClient [TrafficDataClient]
 *                 - htmEngineClient [HtmEngineClient]
 * @constructor
 */
function TrafficPusher(config) {
    this.trafficDataClient = config.trafficDataClient;
    this.htmEngineClient = config.htmEngineClient;
    // These are set upon initialization.
    this.pathDetails = undefined;
    this.pathIds = undefined;
}

/**
 * Do this first thing.
 * @param pathWhitelist [array] only pull these paths, if specified
 * @param callback [function] Called with (error, list of path ids, path
 *                 details object)
 */
TrafficPusher.prototype.init = function(pathWhitelist, callback) {
    var me = this;
    me.trafficDataClient.getPaths(function(err, pathDetails) {
        if (err) return callback(err);
        me.pathDetails = pathDetails;
        me.pathIds = _.keys(pathDetails.keys);
        // For debugging with fewer than all the paths
        if (pathWhitelist) {
            me.pathIds = pathWhitelist;
        }
        callback(null, me.pathIds, pathDetails.keys);
    });
};

/**
 * Attempts to create new models through HtmEngineClient for each path it got
 * back when it initialized. If models already exist, the command is ignored.
 * @param callback
 */
TrafficPusher.prototype.createTrafficModels = function(callback) {
    var me = this,
        modelCreators = [];
    _.each(me.pathIds, function(pathId) {
        modelCreators.push(function(localCallback) {
            me.htmEngineClient.createModel(
                pathId, MIN_SPEED, MAX_SPEED, localCallback
            );
        });
    });
    async.parallel(modelCreators, callback);
};

/**
 * Main logic. This function is called at intervals after start() is called.
 *
 * @param callback
 */
TrafficPusher.prototype.fetch = function(callback) {
    var me = this,
        lastUpdatedFetchers = {};

    console.log('Fetching traffic data...');

    // This sets up an array of functions that will be run asynchronously to
    // retrieve the last updated timestamps for each traffic route. This will
    // inform us of where to start gathering data for each path so we don't poll
    // for data that we already have stored in HTM Engin.
    _.each(me.pathIds, function(id) {
        lastUpdatedFetchers[id] = function(localCallback) {
            me.htmEngineClient.getLastUpdated(id, localCallback);
        };
    });

    console.log('Getting last updated times for all paths...');
    async.parallel(lastUpdatedFetchers, function(err, lastUpdated) {

        // Now `lastUpdated` contains a key:value store of pathId:timestamp of
        // last data stored in HTM Engine.

        var primers = {},
            complete = 0;

        if (err) return callback(err);

        _.each(me.pathIds, function(id) {
            // Here we are just collecting functions that will be executed
            // asynchronously below. The function defined below will be run
            // for each path id.
            primers[id] = function(localCallback) {
                var params = {};
                // Set up query params for the TrafficDataClient.
                if (lastUpdated[id]) {
                    // Only get data we haven't seen yet.
                    params.since = parseInt(lastUpdated[id]);
                } else {
                    // If this is the first data fetch, get only some rows.
                    params.limit = PRIMER_LIMIT;
                }
                // Get complete path data the path in question, identified by id.
                me.trafficDataClient.getPath(id, params, function(err, pathData) {
                    // these are the functions that will post data to the HTM Engine.
                    var htmPosters = [],
                        headers, data;
                    if (err) return callback(err);
                    headers = pathData.headers;
                    data = pathData.data;

                    _.each(data, function(pathData) {
                        // Each data point is posted individually to the HTM Engine
                        // in the function below.
                        htmPosters.push(function(htmCallback) {
                            var timeString = pathData[headers.indexOf(
                                    'datetime')],
                                speed = pathData[headers.indexOf(
                                    'Speed')],
                                timestamp = dateStringToMomentWithZone(
                                    timeString, TZ).unix();
                            me.htmEngineClient.postData(
                                id, speed, timestamp, htmCallback
                            );
                        });
                    });

                    console.log(
                        'Path %s: posting %s data points to HTM engine...',
                        id, data.length
                    );

                    // We've created all the functions that will post the data to
                    // HTM Engine, now we execute them all IN SERIES because they
                    // should arrive at the HTM Engine in the chronological order.
                    async.series(htmPosters, function(err) {
                        // How many left to go, for logging.
                        var left;
                        if (err) return callback(err);
                        left = me.pathIds.length - ++complete;
                        console.log(
                            'Path %s: posted to HTM engine (%s more to go)...',
                            id, left
                        );
                        localCallback(err);
                    });
                });
            };
        });
        // Runs all the primer functions at once.
        async.parallel(primers, callback);
    });
};

/**
 * Starts polling for new traffic data from the TrafficDataClient at the
 * millisecond interval specified.
 * @param interval [integer] milliseconds
 */
TrafficPusher.prototype.start = function(interval) {
    var me = this;
    console.log('TrafficPusher starting...');
    me.createTrafficModels(function(err, responses) {
        var modelCreatedResponses;
        if (err) throw err;
        modelCreatedResponses = _.filter(responses, function(resp) {
            console.log(_.trim(resp[1]));
            return resp[0].statusCode == 201;
        });
        console.log('%s Models created.', modelCreatedResponses.length);
        me.fetch(function(err) {
            if (err) throw err;
            console.log(
                'Polling traffic data at %s intervals...',
                moment.duration(interval, 'ms').humanize()
            );
            setInterval(function() {
                me.fetch(function(err) {
                    if (err) console.error(err);
                });
            }, interval);
        });
    });
};

module.exports = TrafficPusher;
