var qs = require('querystring')
  , request = require('request')
  ;

function TrafficDataClient(riverViewUrl, riverName) {
    this.riverViewUrl = riverViewUrl;
    this.riverName = riverName;
}

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
