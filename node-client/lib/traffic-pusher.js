var _ = require('lodash')
  , async = require('async')
  , moment = require('moment')
  , MIN_SPEED = 0
  , MAX_SPEED = 80
  , PRIMER_LIMIT = 5000
  , ASYNC_MAX = 20
  ;

function timeStringToMoment(timeIn) {
    // 2015-06-29T14:22:49
    var dateString = timeIn.split('T').shift()
      , timeString = timeIn.split('T').pop()
      , datePieces = dateString.split('-')
      , timePieces = timeString.split(':')
      , timeObject = {}
      ;

    timeObject.year = parseInt(datePieces.shift())
    timeObject.month = parseInt(datePieces.shift()) - 1
    timeObject.day = parseInt(datePieces.shift())
    timeObject.hour = parseInt(timePieces.shift())
    timeObject.minute = parseInt(timePieces.shift())
    timeObject.second = parseInt(timePieces.shift())

    return moment(timeObject)
}

function timeStringToMoment_2(timeIn) {
    // 6/29/2015 16:42:48
    var dateString = timeIn.split(' ').shift()
      , timeString = timeIn.split(' ').pop()
      , datePieces = dateString.split('/')
      , timePieces = timeString.split(':')
      , timeObject = {}
      ;

    timeObject.month = parseInt(datePieces.shift()) - 1
    timeObject.day = parseInt(datePieces.shift())
    timeObject.year = parseInt(datePieces.shift())
    timeObject.hour = parseInt(timePieces.shift())
    timeObject.minute = parseInt(timePieces.shift())
    timeObject.second = parseInt(timePieces.shift())

    return moment(timeObject)
}


function TrafficPusher(config) {
    this.trafficDataClient = config.trafficDataClient;
    this.htmEngineClient = config.htmEngineClient;
    this.pathDetails = undefined;
    this.pathIds = undefined;
}

TrafficPusher.prototype.init = function(maxPaths, callback) {
    var me = this;
    me.trafficDataClient.getPaths(function(err, pathDetails) {
        if (err) return callback(err);
        me.pathDetails = pathDetails;
        me.pathIds = _.keys(pathDetails.paths);
        // We do not want to use some paths with stale data. If the DataAsOf prop
        // is older than a month, we'll remove it from the path ids so it doesn't
        // get processed.
        _.each(pathDetails.paths, function(details, id) {
            var date = timeStringToMoment_2(details.DataAsOf)
              , monthAgo = moment(new Date()).subtract(1, 'month')
              ;
            if (date < monthAgo) {
                console.log('Suppressing path %s because of old data', id);
                me.pathIds.splice(me.pathIds.indexOf(id), 1);
            }
        });
        // For debugging with fewer than all the paths
        if (maxPaths) {
            me.pathIds = me.pathIds.slice(0, maxPaths);
        }
        callback(null, me.pathIds, pathDetails.paths);
    });
};

TrafficPusher.prototype.createTrafficModels = function(callback) {
    var me = this
      , modelCreators = [];
    _.each(me.pathIds, function(pathId) {
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
    _.each(me.pathIds, function(id) {
        lastUpdatedFetchers[id] = function(localCallback) {
            me.htmEngineClient.getLastUpdated(id, localCallback);
        };
    });
    console.log('Getting last updated times for all paths...');
    async.parallel(lastUpdatedFetchers, function(err, lastUpdated) {
        var primers = {}
          , complete = 0;
        _.each(me.pathIds, function(id) {
            primers[id] = function(localCallback) {
                var params = {};
                if (lastUpdated[id]) {
                    // Only get data we haven't seen yet.
                    params.since = parseInt(lastUpdated[id]) + 1;
                } else {
                    // If this is the first data fetch, get only some rows.
                    params.limit = PRIMER_LIMIT;
                }
                me.trafficDataClient.getPath(id, params, function(err, allPaths) {
                    var htmPosters = [];
                    _.each(allPaths.path, function(pathData) {
                        htmPosters.push(function(htmCallback) {
                            var timestamp = 
                                timeStringToMoment(pathData.DataAsOf).unix();
                            me.htmEngineClient.postData(
                                id, pathData.Speed, timestamp, htmCallback
                            );
                        });
                    });
                    console.log(
                        'Path %s: posting %s data points to HTM engine...', 
                        id, allPaths.count
                    );
                    async.series(htmPosters, function(err) {
                        var left = me.pathIds.length - ++complete;
                        console.log(
                            'Path %s: posted to HTM engine (%s more to go)...', 
                            id, left
                        );
                        localCallback(err);
                    });
                });
            };
        });
        async.parallel(primers, callback);
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
            console.log(
                'Polling traffic data at %s intervals...',
                moment.duration(interval, 'ms').humanize()
            );
            setInterval(function() {
                me.fetch();
            }, interval);
        });
    });};

module.exports = TrafficPusher;
