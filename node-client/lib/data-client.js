var request = require('request')
  , _ = require('lodash')
  , async = require('async');

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
        callback(error, JSON.parse(body));
    });
};

DataClient.prototype.getAllPathData = function(params, callback) {
    var me = this;
    me.getPaths(function(error, data) {
        if (error) return callback(error);
        var pathFetchers = {};
        _.each(data.paths, function(pathId) {
            pathFetchers[pathId] = function(localCallback) {
                me.getPath(pathId, params, localCallback);
            };
        });
        async.parallel(pathFetchers, callback);
    });
};

module.exports = DataClient;
