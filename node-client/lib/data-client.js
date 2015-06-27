var request = require('request')
  , _ = require('lodash')
  , async = require('async')
  , ASYNC_LIMIT = 10;

function DataClient(uri) {
    this.uri = uri;
}

DataClient.prototype.getPaths = function(callback) {
    request.get(this.uri + '/paths/', function(error, response, body) {
        callback(error, JSON.parse(body));
    });
};

DataClient.prototype.getPath = function(id, params, callback) {
    var url = this.uri + '/' + id;
    if (params && params.limit) {
        url += '?limit=' + params.limit;
    }
    request.get(url, function(error, response, body) {
        if (error) return callback(error);
        callback(null, JSON.parse(body));
    });
};

module.exports = DataClient;
