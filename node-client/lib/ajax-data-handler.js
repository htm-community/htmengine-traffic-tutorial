var url = require('url')
  , qs = require('querystring')
  , moment = require('moment-timezone')
  , _ = require('lodash')
  , htmEngineClient
  ;

function respondInCsv(error, data, res) {
    var csv = ''
      , headers = [];
    res.setHeader('Content-Type', 'text');
    if (error) {
        res.statusCode = 400;
        res.end(error.message);
    } else {
        // Headers are the keys
        headers = ['timestamp', 'value', 'anomaly']
        csv += headers.join(',') + '\n';
        _.each(data, function(pathData, index) {
            var rowOut = _.map(headers, function(key) {
                if (key == 'timestamp') {
                    return moment(new Date(parseInt(pathData[key]) * 1000)).tz('America/New_York');
                } else {
                    return pathData[key];
                }
            });
            rowOut = _.without(rowOut, undefined);
            csv += rowOut.join(',') + '\n';
        });
        res.end(csv);
    }
}

function dataRequestHandler(req, res) {
    var pathId = req.params.pathId;
    htmEngineClient.getData(pathId, function(err, data) {
        respondInCsv(err, data, res);
    });
}

function init(client) {
    htmEngineClient = client;
    return dataRequestHandler;
}

module.exports = init;
