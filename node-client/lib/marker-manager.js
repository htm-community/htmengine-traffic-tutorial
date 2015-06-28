var fs = require('fs');

function MarkerManager(markerFilePath) {
    this.filePath = markerFilePath;
    this.markers = {};
}

MarkerManager.prototype.init = function(callback) {
    var me = this;
    fs.exists(me.filePath, function(exists) {
        if (! exists) {
            fs.writeFile(me.filePath, '{}', function(err) {
                if (err) return callback(err);
                callback();
            });
        } else {
            fs.readFile(me.filePath, 'utf-8', function(err, contents) {
                me.markers = JSON.parse(contents);
                callback();
            });
        }
    });
};

MarkerManager.prototype.updateById = function(id, ts, callback) {
    var me = this;
    fs.readFile(me.filePath, 'utf-8', function(err, contents) {
        var markers;
        if (err) {
            if (callback) callback(err);
            return;
        }
        markers = JSON.parse(contents);
        markers[id] = ts;
        console.log('updating marker for %s to %s', id, ts);
        fs.writeFile(me.filePath, JSON.stringify(markers, null, 2), function(err) {
            if (err) {
                if (callback) callback(err);
                return;
            }
            me.markers = markers;
            if (callback) callback();
        });
    });
};

MarkerManager.prototype.update = function(markers, callback) {
    var me = this;
    fs.writeFile(me.filePath, JSON.stringify(markers, null, 2), function(err) {
        if (err) {
            if (callback) callback(err);
            return;
        }
        me.markers = markers;
        if (callback) callback(null);
    });
};

MarkerManager.prototype.isNew = function(id, ts) {
    return ts > this.markers[id];
};


module.exports = MarkerManager;