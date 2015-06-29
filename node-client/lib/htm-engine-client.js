var request = require('request')
  , _ = require('lodash')
  ;

function HtmEngineClient(url) {
    this.url = url;
}

HtmEngineClient.prototype.postData = function(id, value, timestamp, callback) {
    var url = this.url + '/' + id
      , body = value + ' ' + timestamp
      ;
    // console.log('posting to %s with %s', url, body);
    request.post(url, {body: body}, callback);
};

HtmEngineClient.prototype.createModel = function(id, min, max, callback) {
    var url = this.url + '/' + id;
    console.log('Creating model %s...', id);
    request({
        url: url
      , method: 'PUT'
      , json: { min: min, max: max }
    }, callback);
};

HtmEngineClient.prototype.getData = function(id, callback) {
    var url = this.url + '/' + id;
    request.get(url, function(err, response, body) {
        var rows = [];
        if (err) return callback(err);
        if (! body) {
            return callback(null, []);
        }
        rows = _.map(_.trim(body).split('\n'), function(rowString) {
            var peices = rowString.split(/\s+/)
              , value = Number(peices[1])
              , timestamp = parseInt(peices[2])
              , anomalyScore = peices[3]
              ;
            if (anomalyScore == 'None') {
                anomalyScore = undefined;
            } else {
                anomalyScore = Number(anomalyScore);
            }
            return {
                value: value
              , timestamp: timestamp
              , anomaly: anomalyScore
            };
        });
        callback(null, rows);
    });
};

HtmEngineClient.prototype.getLastUpdated = function(id, callback) {
    this.getData(id, function(err, data) {
        if (err) return callback(err);
        if (! data.length) return callback();
        callback(null, data[data.length - 1].timestamp);
    });
};


module.exports = HtmEngineClient;
