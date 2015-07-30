$(function() {

    var TZ = 'America/New_York',
        pageTitle, sliderOpts, query = getUrlQuery(),
        map, $loading, now = moment(),
        $slider = $('#slider'),
        $showRoutes = $('input.routes'),
        $showIncidents = $('input.incidents');

    moment.tz.setDefault(TZ);

    $.get('{{ baseurl }}/templates/markerLabel.hbt', function(markerTemplate) {

        map = new TrafficMap('map-canvas', '{{baseurl}}', markerTemplate, {
            center: {
                lat: 40.7903,
                lng: -73.9597
            },
            zoom: 11
        });

        $loading.show();

        $.getJSON('{{ baseurl }}/data/pathDetails', query, function(data) {
            var minMax = $slider.dateRangeSlider('values'),
                min = moment(minMax.min).tz(TZ),
                max = moment(minMax.max).tz(TZ),
                pathFetchers = [];

            map.enableSearchBox('pac-input');
            map.enableRightClickSearch();
            map.setRoutePaths(data.paths);

            _.each(map.routes, function(rte) {
                var color;
                pathFetchers.push(function(callback) {
                    $.get('{{ baseurl }}/data/' + rte.id, function(csv) {
                        rte.data = csvStringToData(csv);
                        callback();
                    });
                });
                color = getGreenToRed(0);
                rte.line.setOptions({
                    strokeColor: '#' + color
                });
            });

            // One more data fetcher to get traffic incident reports from River View.
            pathFetchers.push(function(callback) {
                $.getJSON(
                    'http://data.numenta.org/twitter-511nyc/twitter-511nyc/data.json?callback=?',
                    function(resp) {
                        var out = [],
                            data = resp.data,
                            headers = resp.headers;
                        _.each(data, function(datum) {
                            var point = {};
                            if (datum[headers.indexOf('latitude')] &&
                                datum[headers.indexOf('longitude')]
                            ) {
                                _.each(headers, function(header, i) {
                                    point[header] = datum[i];
                                });
                                point.datetime =
                                    dateStringToMomentWithZone(
                                        point.datetime, TZ);
                                out.push(point);
                            }
                        });
                        map.setIncidents(out);
                        callback();
                    });
            });

            async.parallel(pathFetchers, function(err) {
                if (err) throw err;
                map.setMinMaxTime(min, max);
                $loading.hide();
                $('.modal-backdrop').remove();
                $('body').removeClass('modal-open');
                $showRoutes.change(function() {
                    map.setMarkersVisible('routes', $showRoutes.is(
                        ':checked'));
                });
                $showIncidents.change(function() {
                    map.setMarkersVisible('incidents', $showIncidents.is(
                        ':checked'));
                });
            });

            $slider.bind('valuesChanging', function(e, data) {
                var min = moment(data.values.min).tz(TZ),
                    max = moment(data.values.max).tz(TZ);
                map.setMinMaxTime(min, max);
            });

        });

    });

    if (query.borough) {
        query.borough = query.borough.replace('%20', ' ')
        pageTitle = 'Map of ' + query.borough;
    } else if (query.id) {
        pageTitle = 'Map of route(s): ' + query.id;
    }

    $('#title h1').html(pageTitle);
    $('title').html(pageTitle);
    $loading = $('#loading').modal({
        keyboard: false
    });


    // SLIDER
    sliderOpts = {
        bounds: {
            min: moment(now).subtract(2, 'days').toDate(),
            max: now.toDate()
        },
        defaultValues: {
            min: moment(now).subtract(3, 'hours').toDate(),
            max: now.toDate()
        },
        formatter: function(val) {
            return moment(val).format('MMM D HH:mm');
        }
    };

    $slider.dateRangeSlider(sliderOpts);

    function dateStringToMomentWithZone(timeIn, zone) {
        // 2015/07/01 18:04:03
        var dateString = timeIn.split(' ').shift(),
            timeString = timeIn.split(' ').pop(),
            datePieces = dateString.split('/'),
            timePieces = timeString.split(':'),
            timeObject = {};

        timeObject.year = parseInt(datePieces.shift());
        timeObject.month = parseInt(datePieces.shift()) - 1;
        timeObject.day = parseInt(datePieces.shift());

        timeObject.hour = parseInt(timePieces.shift());
        timeObject.minute = parseInt(timePieces.shift());
        timeObject.second = parseInt(timePieces.shift());

        return moment.tz(timeObject, zone);
    }

    function csvStringToData(csv) {
        var rows = csv.trim().split('\n'),
            headers = rows.shift().split(','),
            out;
        rows = _.map(rows, function(row) {
            return row.split(',');
        });
        out = _.map(rows, function(row) {
            var obj = {};
            _.each(headers, function(header, i) {
                if (header == 'timestamp') {
                    obj[header] = dateStringToMomentWithZone(row[i], TZ)
                } else {
                    obj[header] = parseFloat(row[i]);
                }
            });
            return obj;
        });
        return out;
    }

});