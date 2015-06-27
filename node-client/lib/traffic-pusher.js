var fs = require('fs')
  , _ = require('lodash')
  , async = require('async')
  , moment = require('moment-timezone')
  , request = require('request')
  , PRIMER_LIMIT = 10
  , DEFAULT_LIMIT = 10
  , DEFAULT_INTERVAL = 60000 * 10
  ;

moment.tz.setDefault("America/New_York");

function TrafficPusher(config) {
    this.dataClient = config.dataClient;
    this.markerFile = config.markerFile;
    this.htmEngineServer = config.htmEngineServer;
    this.limit = config.limit || DEFAULT_LIMIT;
    this.interval = config.interval || DEFAULT_INTERVAL;
    this.pathDetails = undefined;
}

TrafficPusher.prototype.init = function(callback) {
    var me = this;
    function fetchPathDetails() {
        me.dataClient.getPaths(function(err, pathDetails) {
            if (err) return callback(err);
            me.pathDetails = pathDetails;
            callback();
        });
    }
    fs.exists(me.markerFile, function(exists) {
        if (! exists) {
            fs.writeFile(me.markerFile, '{}', function(err) {
                me._markers = {};
                fetchPathDetails();
            });
        } else {
            fs.readFile(me.markerFile, 'utf-8', function(err, markerText) {
                me._markers = JSON.parse(markerText);
                fetchPathDetails();
            });
        }
    });
};

TrafficPusher.prototype._updateMarker = function(id, ts, callback) {
    var me = this;
    fs.readFile(me.markerFile, 'utf-8', function(err, contents) {
        var markers;
        if (err) return callback(err);
        markers = JSON.parse(contents);
        markers[id] = ts;
        console.log('updating marker for %s to %s', id, ts);
        fs.writeFile(me.markerFile, JSON.stringify(markers), function(err) {
            if (err) return callback(err);
            me._markers = markers;
            callback();
        });
    });
};

TrafficPusher.prototype._pushPathData = function(id, data, callback) {
    var me = this
      , url = me.htmEngineServer + '/' + id
      , validData = []
      , posters = [];
    // console.log('Found %s total data points for path %s.', data.count, id);
    // First, we filter out all the data that has already been pushed to NuPIC,
    // based on our local marker cache.
    validData = _.filter(data.path, function(pathData) {
        var dataTime, marker;
        if (! me._markers[id]) {
            return true;
        }
        marker = moment(new Date(me._markers[id] * 1000)).toString();
        dataTime = moment(new Date(pathData.DataAsOf)).toString();
        // console.log('---\n' + marker + '\n' + dataTime);
        return dataTime > marker;
    });
    // console.log('Found %s valid points for %s', validData.length, id);
    _.each(validData, function(pathData) {
        posters.push(function(localCallback) {
            var time = moment(new Date(pathData.DataAsOf))
              , timestamp = time.unix()
              , body = pathData.Speed + ' ' + timestamp
              ;
            console.log('posting to %s with %s', url, body);
            request.post(url, {body: body}, localCallback);
        });
    });
    if (posters.length) {
        console.log('Posting all path data for %s...', id);
        async.series(posters, function(err, responses) {
            if (err) return callback(err);
            var time = moment(new Date(data.properties.DataAsOf))
              , timestamp = time.unix()
              ;
            _.each(responses, function(resp) {
                console.log(_.trim(resp[1]));
            });
            // console.log('Updating marker for %s to %s...', id, timestamp);
            me._updateMarker(id, timestamp, function(err) {
                // console.log('Done with path %s (processed %s data points).', id, responses.length);
                callback(err);
            });
        });
    } else {
        callback();
    }
};

TrafficPusher.prototype.fetchAllPathData = function(callback) {
    var me = this
      , fetchers = [];
    _.each(me.pathDetails.paths, function(pathId) {
        fetchers.push(function(localCallback) {
            me.dataClient.getPath(pathId, {
                limit: me.limit
            }, function(err, pathData) {
                if (err) return localCallback(err);
                me._pushPathData(pathId, pathData, localCallback);
            });
        });
    });
    async.series(fetchers, callback);
};


TrafficPusher.prototype.createTrafficModels = function(callback) {
    var me = this
      , putBody = {
          min: 0
        , max: 80
      }
      , modelCreators = [];
    _.each(me.pathDetails.paths, function(data, pathId) {
        modelCreators.push(function(localCallback) {
            var url = me.htmEngineServer + '/' + pathId;
            request({
                url: url
              , method: 'PUT'
              , json: putBody
          }, localCallback);
        });
    });
    async.parallel(modelCreators, callback);
};

TrafficPusher.prototype.start = function(callback) {
    var me = this;
    console.log('TrafficPusher starting...');
    me.fetchAllPathData(function(err, pathData) {
        if (err) throw err;
        console.log('Initial data fetch complete.');
        setInterval(function() {
            me.fetchAllPathData();
        }, me.interval);
        callback();
    });
};

module.exports = TrafficPusher;
