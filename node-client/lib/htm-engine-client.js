var request = require('request'),
    _ = require('lodash');

/**
 * Interfaces with the python HTTP server from ../../python-engine/webapp.py
 * @param url [string] URL of the python server
 * @constructor
 */
function HtmEngineClient(url) {
    this.url = url;
}

/**
 * Post data to a model.
 * @param id [string] model id
 * @param value [float] model value
 * @param timestamp [integer] UNIX timestamp associated with value
 * @param callback [function] might be sent error
 */
HtmEngineClient.prototype.postData = function(id, value, timestamp, callback) {
    var url = this.url + '/' + id,
        body = value + ' ' + timestamp;
    request.post(url, {
        body: body
    }, callback);
};

/**
 * Creates a new model with specified id, min, and max values. If model exists,
 * command is ignored.
 * @param id [string] model id
 * @param min [float] min value for input data
 * @param max [float] max value for input data
 * @param callback
 */
HtmEngineClient.prototype.createModel = function(id, min, max, callback) {
    var url = this.url + '/' + id;
    console.log('Creating model %s...', id);
    request({
        url: url,
        method: 'PUT',
        json: {
            min: min,
            max: max
        }
    }, callback);
};

/**
 * Gets ALL the data for specified model.
 * @param id [string] model id
 * @param callback [function] called with (err, rows)
 */
HtmEngineClient.prototype.getData = function(id, callback) {
    var url = this.url + '/' + id;
    request.get(url, function(err, response, body) {
        var rows;
        if (err) return callback(err);
        if (!body) {
            return callback(null, []);
        }
        rows = _.map(_.trim(body).split('\n'), function(rowString) {
            var pieces = rowString.split(/\s+/),
                value = Number(pieces[1]),
                timestamp = parseInt(pieces[2]),
                anomalyScore = pieces[3];
            if (anomalyScore == 'None') {
                anomalyScore = undefined;
            } else {
                anomalyScore = Number(anomalyScore);
            }
            return {
                value: value,
                timestamp: timestamp,
                anomaly: anomalyScore
            };
        });
        callback(null, rows);
    });
};

/**
 * Returns the timestamp for the last data point given a model id.
 * @param id
 * @param callback
 */
HtmEngineClient.prototype.getLastUpdated = function(id, callback) {
    this.getData(id, function(err, data) {
        if (err) return callback(err);
        if (!data.length) return callback();
        callback(null, data[data.length - 1].timestamp);
    });
};


module.exports = HtmEngineClient;
