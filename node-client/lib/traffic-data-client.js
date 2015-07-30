var qs = require('querystring'),
    request = require('request');

/**
 * This is an interface for a River View instance.
 * See https://github.com/nupic-community/river-view for details.
 * @param riverViewUrl [string] URL of river view instance
 * @param riverName [string] river name
 * @constructor
 */
function TrafficDataClient(riverViewUrl, riverName) {
    this.riverViewUrl = riverViewUrl;
    this.riverName = riverName;
}

/**
 * Get all path details for all paths, returned in an object keyed by path ids.
 * @param callback
 */
TrafficDataClient.prototype.getPaths = function(callback) {
    var url = this.riverViewUrl + '/' + this.riverName + '/keys.json?includeDetails=1';
    request.get(url, function(error, response, body) {
        var jsonOut;
        try {
            jsonOut = JSON.parse(body);
        } catch (err) {
            console.log(url);
            console.log(body);
            callback(err);
        }
        callback(error, jsonOut);
    });
};

/**
 * Get all data for one path, using the specified query parameters.
 * @param id [string] path ID
 * @param params [object] query parameters (limit=N, since=unix_timestamp, until=unix_timestamp)
 * @param callback
 */
TrafficDataClient.prototype.getPath = function(id, params, callback) {
    var url = this.riverViewUrl + '/' + this.riverName + '/' + id + '/data.json';
    if (params) {
        url += '?' + qs.stringify(params);
    }
    console.log(url);
    request.get(url, function(error, response, body) {
        if (error) return callback(error);
        var jsonOut;
        try {
            jsonOut = JSON.parse(body);
        } catch (err) {
            console.log(url);
            console.log(body);
            callback(err);
        }
        callback(null, jsonOut);
    });
};

module.exports = TrafficDataClient;
