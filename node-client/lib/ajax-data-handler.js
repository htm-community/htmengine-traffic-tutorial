/* This file handles all the AJAX data requests coming from the browser. It only
 * exports an initializer function, which expects to be passed clients for the
 * HTM Engine and data server.
 *
 * URL routes are not defined in this file, they are all in the index.js.
 */
var url = require('url'),
    moment = require('moment-timezone'),
    _ = require('lodash'),
    async = require('async'),
    jsonUtils = require('./json'),
    DATE_FORMAT = 'YYYY/MM/DD HH:mm:ss',
    TZ = "America/New_York",
    htmEngineClient,
    trafficDataClient,
    pathIds,
    pathDetails;

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
    var pathId = req.params.pathId,
        query = req.query || {};
    getOnePathData(pathId, query, function(err, data) {
        if (err) {
            res.statusCode = 400;
            res.end(err.message);
            return;
        }
        respondInCsv(data, ['timestamp', 'value', 'anomaly'], res);
    });
}

function getOnePathData(id, query, callback) {
    htmEngineClient.getData(id, function(err, pathData) {
        var filtered;
        var limit;
        if (err) return callback(err);
        if (_.keys(query).length) {
            // Apply time filters
            filtered = _.filter(pathData, function(point) {
                 //console.log(
                 //    '%s\t%s\t%s'
                 //  , moment.tz(query.since*1000, TZ).format()
                 //  , moment.tz(point.timestamp*1000, TZ).format()
                 //  , moment.tz(query.until*1000, TZ).format()
                 //);
                var match = (!query.since || point.timestamp > query.since)
                         && (!query.until || point.timestamp < query.until);
                 //console.log(match);
                return match;
            });
            // Apply limit
            if (query.limit) {
                limit = parseInt(query.limit);
                //console.log('applying limit %s', limit);
                // remove all elements after the limit
                filtered.splice(limit, filtered.length);
            }
        } else {
            filtered = pathData;
        }
        callback(null, filtered);
    });
}

function getAllPathData(pathIds, query, callback) {
    var dataFetchers = {},
        borough = query.borough;
    _.each(pathIds, function(id) {
        if (!borough || borough.toLowerCase() == pathDetails[id].Borough.toLowerCase()) {
            dataFetchers[id] = function(localCallback) {
                getOnePathData(id, query, localCallback);
            };
        }
    });
    async.parallel(dataFetchers, callback);
}

function getAllAnomalies(req, res) {
    getAllPathData(pathIds, {
        borough: req.query.borough
    }, function(err, pathData) {
        var keys, matrix = {};

        if (err) {
            res.statusCode = 400;
            res.end(err.message);
            return;
        }

        keys = _.keys(pathData);

        _.each(pathData, function(data, id) {
            _.each(data, function(point) {
                var ts = point.timestamp,
                    index = keys.indexOf(id);
                if (!matrix[ts]) {
                    matrix[ts] = new Array(keys.length);
                }
                matrix[ts][index] = point.anomaly;
            });
        });

        res.setHeader('Content-Type', 'text');

        // Write header row
        res.write(['timestamp'].concat(keys).join(',') + ',dummy\n');

        _.each(_.keys(matrix).sort(), function(ts) {
            var dataRow = matrix[ts],
                date = timestampToMomentWithZone(ts, TZ).format(DATE_FORMAT);
            res.write([date].concat(dataRow).join(',') + ',\n');
        });

        res.end();
    });
}

function getAnomalyAverage(req, res) {
    getAllPathData(pathIds, {
        borough: req.query.borough
    }, function(err, pathData) {
        var keys, timeKeys, matrix = {};

        if (err) {
            res.statusCode = 400;
            res.end(err.message);
            return;
        }

        keys = _.keys(pathData);

        _.each(pathData, function(data, id) {
            _.each(data, function(point) {
                var ts = point.timestamp,
                    index = keys.indexOf(id);
                if (!matrix[ts]) {
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
            var dataRow = matrix[ts],
                date = timestampToMomentWithZone(ts, TZ),
                before = moment(date).subtract(5, 'minutes'),
                after = moment(date).add(5, 'minutes'),
                anomalySum = 0,
                valueCount = 0,
                overThreshhold = [],
                averageAnomaly;

            _.each(timeKeys, function(windowTimestamp) {
                if (before.unix() < windowTimestamp && windowTimestamp < after.unix()) {
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
                date.format(DATE_FORMAT) + ',' + averageAnomaly + ',' + overThreshhold.length +
                '\n'
            );

        });

        res.end();
    });
}

function getPathDetails(req, res) {
    trafficDataClient.getPaths(function(err, data) {
        var paths = {},
            borough = '',
            ids = [];
        if (err) return jsonUtils.renderErrors([err], res);

        if (req.query.id || req.query.borough) {
            if (req.query.id) {
                if (req.query.id.indexOf(',')) {
                    ids = req.query.id.split(',');
                }
            }
            if (req.query.borough) {
                borough = req.query.borough.toLowerCase();
            }
            _.each(data.keys, function(details, id) {
                if (ids.indexOf(id) > -1 || details.Borough.toLowerCase() == borough) {
                    paths[id] = details;
                }
            });
        } else {
            _.each(data.keys, function(details, id) {
                paths[id] = details;
            });
        }

        jsonUtils.render({
            paths: paths,
            count: _.keys(paths).length
        }, res);
    });
}

function getPathsWithAnomaliesAbove(req, res) {
    var score = req.query.threshold,
        paths = {},
        out = [];
    getAllPathData(pathIds, req.query, function(err, pathData) {
        _.each(pathData, function(data, id) {
            _.each(data, function(point) {
                var ts = point.timestamp,
                    anomaly = point.anomaly;
                if (anomaly > parseFloat(score)) {
                    if (!paths[id]) {
                        paths[id] = 0;
                    }
                    paths[id] = paths[id] + 1;
                }
            });
        });

        _.each(paths, function(count, id) {
            out.push({
                id: id,
                count: count
            });
        });

        out = _.sortBy(out, function(item) {
            return item.count;
        }).reverse();

        jsonUtils.render(out, res);
    });
}

function init(htmClient, trafficClient, ids, details) {
    htmEngineClient = htmClient;
    trafficDataClient = trafficClient;
    pathIds = ids;
    pathDetails = details;
    return {
        getPathData: getPathData,
        getAllAnomalies: getAllAnomalies,
        getAnomalyAverage: getAnomalyAverage,
        getPathDetails: getPathDetails,
        getPathsWithAnomaliesAbove: getPathsWithAnomaliesAbove
    };
}

module.exports = init;
