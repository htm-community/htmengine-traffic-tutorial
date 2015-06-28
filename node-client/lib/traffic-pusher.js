var _ = require('lodash')
  , async = require('async')
  , moment = require('moment-timezone')
  , MIN_SPEED = 0
  , MAX_SPEED = 80
  , PRIMER_LIMIT = 500
  ;

moment.tz.setDefault("America/New_York");

function TrafficPusher(config) {
    this.trafficDataClient = config.trafficDataClient;
    this.htmEngineClient = config.htmEngineClient;
    this.markerManager = config.markerManager;
    this.pathDetails = undefined;
}

TrafficPusher.prototype.init = function(callback) {
    var me = this;
    me.markerManager.init(function(err) {
        if (err) return callback(err);
        me.trafficDataClient.getPaths(function(err, pathDetails) {
            if (err) return callback(err);
            me.pathDetails = pathDetails;
            callback(null, pathDetails.paths);
        });
    });
};

TrafficPusher.prototype.createTrafficModels = function(callback) {
    var me = this
      , modelCreators = [];
    _.each(me.pathDetails.paths, function(data, pathId) {
        modelCreators.push(function(localCallback) {
            me.htmEngineClient.createModel(
                pathId, MIN_SPEED, MAX_SPEED, localCallback
            );
        });
    });
    async.parallel(modelCreators, callback);
};

TrafficPusher.prototype.fetch = function(callback) {
    var me = this
      , lastUpdatedFetchers = {};
    console.log('Fetching traffic data...');
    _.each(me.pathDetails.paths, function(id) {
        lastUpdatedFetchers[id] = function(localCallback) {
            me.htmEngineClient.getLastUpdated(id, localCallback);
        };
    });
    console.log('Getting last updated times for all paths...');
    async.parallel(lastUpdatedFetchers, function(err, lastUpdated) {
        var primers = {};
        _.each(me.pathDetails.paths, function(id) {
            primers[id] = function(localCallback) {
                var params = {};
                if (lastUpdated[id]) {
                    // Only get data we haven't seen yet.
                    params.since = parseInt(lastUpdated[id]) + 1;
                } else {
                    // If this is the first data fetch, get only some rows.
                    params.limit = PRIMER_LIMIT;
                }
                me.trafficDataClient.getPath(id, params, localCallback);
            };
        });
        async.parallel(primers, function(err, primerData) {
            var htmPosters = [];
            _.each(primerData, function(pathData, id) {
                _.each(pathData.path, function(pathData) {
                    var timestamp = moment(new Date(pathData.DataAsOf)).unix();
                    // if (me.markerManager.isNew(id, timestamp)) {
                        htmPosters.push(function(localCallback) {
                            me.htmEngineClient.postData(
                                id, pathData.Speed, timestamp, localCallback
                            );
                        });
                    // }
                });
            });
            async.series(htmPosters, function(err) {
                if (err) {
                    if (callback) callback(err);
                    return;
                }
                me.markerManager.update(lastUpdated, callback);
            });
        });
    });
};

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
            console.log('Polling traffic data at %ss intervals...', interval);
            setInterval(function() {
                me.fetch();
            }, interval);
        });
    });};

module.exports = TrafficPusher;
