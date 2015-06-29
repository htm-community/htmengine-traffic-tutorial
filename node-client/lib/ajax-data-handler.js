var url = require('url')
  , qs = require('querystring')
  , moment = require('moment')
  , _ = require('lodash')
  , async = require('async')
  , htmEngineClient
  , pathIds
  , pathDetails
  ;

function respondInCsv(data, headers, res) {
    var csv = '';
    res.setHeader('Content-Type', 'text');
    csv += headers.join(',') + '\n';

    _.each(data, function(pathData, index) {
        var rowOut = _.map(headers, function(key) {
            if (key == 'timestamp') {
                return moment(new Date(parseInt(pathData[key]) * 1000));
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

function getAllAnomalies(req, res) {
    var dataFetchers = {};
    _.each(pathIds, function(id) {
        dataFetchers[id] = function(callback) {
            htmEngineClient.getData(id, callback);
        };
    });
    async.parallel(dataFetchers, function(err, pathData) {
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
              , date = new Date(ts * 1000);
            res.write([date].concat(dataRow).join(',') + '\n');
        });
        
        res.end();
    });
}

function getAnomalyAverage(req, res) {
    var dataFetchers = {};
    _.each(pathIds, function(id) {
        dataFetchers[id] = function(callback) {
            htmEngineClient.getData(id, callback);
        };
    });
    async.parallel(dataFetchers, function(err, pathData) {
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
        res.write('timestamp, average anomaly score\n');

        timeKeys = _.keys(matrix).sort()

        _.each(timeKeys, function(ts) {
            var dataRow = matrix[ts]
              , date = moment(new Date(ts * 1000))
              , tenBefore = moment(date).subtract(15, 'minutes')
              , tenAfter = moment(date).add(15, 'minutes')
              // , timeWindow
              , anomalySum = 0
              , valueCount = 0
              , averageAnomaly
              ;

            _.each(timeKeys, function(windowTimestamp) {
                if (tenBefore.unix() < windowTimestamp 
                && windowTimestamp < tenAfter.unix()) {
                    _.each(matrix[windowTimestamp], function(value) {
                        if (value !== undefined) {
                            valueCount++;
                            anomalySum += value;
                        }
                    });
                }
            });

            averageAnomaly = anomalySum / valueCount;
            res.write(date.format() + ',' + averageAnomaly + '\n');

        });
        
        res.end();
    });
}

function init(client, ids, details) {
    htmEngineClient = client;
    pathIds = ids;
    pathDetails = details
    return {
        getPathData: getPathData
      , getAllAnomalies: getAllAnomalies
      , getAnomalyAverage: getAnomalyAverage
    };
}

module.exports = init;
