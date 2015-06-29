var qs = require('querystring')
  , request = require('request')
  ;

function TrafficDataClient(uri) {
    this.uri = uri;
}

TrafficDataClient.prototype.getPaths = function(callback) {
    var url = this.uri + '/paths/?includeDetails=1';
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

TrafficDataClient.prototype.getPath = function(id, params, callback) {
    var url = this.uri + '/' + id;
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
