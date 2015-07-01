var url = require('url')
  , qs = require('querystring')
  , moment = require('moment-timezone')
  , _ = require('lodash')
  , async = require('async')

  , jsonUtils = require('./json')

  , DATE_FORMAT = 'YYYY/MM/DD HH:mm:ss'
  , TZ = "America/New_York"

  , htmEngineClient
  , trafficDataClient
  , pathIds
  , pathDetails
  , anomalyThreshold = require('../conf/config').anomalyThreshold
  ;

function timestampToMomentWithZone(ts, zone) {
    var ts = parseInt(ts);
    return moment.tz(ts * 1000, zone);
}

function respondInCsv(data, headers, res) {
    var csv = '';
    res.setHeader('Content-Type', 'text');
    csv += headers.join(',') + '\n';

    _.each(data, function(pathData, index) {
        var rowOut = _.map(headers, function(key) {
            if (key == 'timestamp') {
                return timestampToMomentWithZone(pathData[key], TZ)
                                                .format(DATE_FORMAT);
            } else {
                return pathData[key];
            }
        });
        rowOut = _.without(rowOut, undefined);
        csv += rowOut.join(',') + '\n';
    });
    res.end(csv);
}

function getPathData(req, res) {
    var pathId = req.params.pathId;
    htmEngineClient.getData(pathId, function(err, data) {
        if (err) {
            res.statusCode = 400;
            res.end(err.message);
            return;
        }
        respondInCsv(data, ['timestamp', 'value', 'anomaly'], res);
    });
}

function fetchPathData(pathIds, callback) {
    var dataFetchers = {};
    _.each(pathIds, function(id) {
        dataFetchers[id] = function(localCallback) {
            htmEngineClient.getData(id, localCallback);
        };
    });
    async.parallel(dataFetchers, callback);
}

function getAllAnomalies(req, res) {
    fetchPathData(pathIds, function(err, pathData) {
        var keys
          , matrix = {};

        if (err) {
            res.statusCode = 400;
            res.end(err.message);
            return;
        }

        keys = _.keys(pathData);

        _.each(pathData, function(data, id) {
            _.each(data, function(point) {
                var ts = point.timestamp
                  , index = keys.indexOf(id)
                  ;
                if (! matrix[ts]) {
                    matrix[ts] = new Array(keys.length);
                }
                matrix[ts][index] = point.anomaly;
            });
        });

        res.setHeader('Content-Type', 'text');

        // Write header row
        res.write(['timestamp'].concat(keys).join(',') + '\n');

        _.each(_.keys(matrix).sort(), function(ts) {
            var dataRow = matrix[ts]
              , date = timestampToMomentWithZone(ts, TZ).format(DATE_FORMAT)
              ;
            res.write([date].concat(dataRow).join(',') + '\n');
        });
        
        res.end();
    });
}

function getAnomalyAverage(req, res) {
    fetchPathData(pathIds, function(err, pathData) {
        var keys
          , timeKeys
          , matrix = {};

        if (err) {
            res.statusCode = 400;
            res.end(err.message);
            return;
        }

        keys = _.keys(pathData);

        _.each(pathData, function(data, id) {
            _.each(data, function(point) {
                var ts = point.timestamp
                  , index = keys.indexOf(id)
                  ;
                if (! matrix[ts]) {
                    matrix[ts] = new Array(keys.length);
                }
                matrix[ts][index] = point.anomaly;
            });
        });

        res.setHeader('Content-Type', 'text');

        // Write header row
        res.write('timestamp, average anomaly score,over threshold\n');

        timeKeys = _.keys(matrix).sort()

        _.each(timeKeys, function(ts) {
            var dataRow = matrix[ts]
              , date = timestampToMomentWithZone(ts)
              , tenBefore = moment(date).subtract(5, 'minutes')
              , tenAfter = moment(date).add(5, 'minutes')
              , anomalySum = 0
              , valueCount = 0
              , overThreshhold = []
              , averageAnomaly
              ;

            _.each(timeKeys, function(windowTimestamp) {
                if (tenBefore.unix() < windowTimestamp 
                && windowTimestamp < tenAfter.unix()) {
                    _.each(matrix[windowTimestamp], function(value) {
                        if (value !== undefined) {
                            valueCount++;
                            anomalySum += value;
                            if (value > 0.9) {
                                overThreshhold.push(value);
                            }
                        }
                    });
                }
            });

            averageAnomaly = anomalySum / valueCount;
            res.write(
                date.format(DATE_FORMAT) + ',' 
                + averageAnomaly + ',' 
                + overThreshhold.length + '\n'
            );

        });
        
        res.end();
    });
}

function getPathDetails(req, res) {
    trafficDataClient.getPaths(function(err, data) {
        if (err) return jsonUtils.renderErrors([err], res);
        // filter boroughs if necessary
        var doomed = []
          , borough;
        if (req.query && req.query.borough) {
            borough = req.query.borough;
            _.each(data.paths, function(details, id) {
                if (details.Borough.toLowerCase() != borough.toLowerCase()) {
                    doomed.push(id);
                }
            });
            _.each(doomed, function(toRemove) {
                delete data.paths[toRemove];
            });
            data.count -= doomed.length;
        }
        jsonUtils.render(data, res);
    });
}

function init(htmClient, trafficClient, ids, details) {
    htmEngineClient = htmClient;
    trafficDataClient = trafficClient;
    pathIds = ids;
    pathDetails = details
    return {
        getPathData: getPathData
      , getAllAnomalies: getAllAnomalies
      , getAnomalyAverage: getAnomalyAverage
      , getPathDetails: getPathDetails
    };
}

module.exports = init;
