
$(function() {

    /* < BAG OF FUNCTIONS > */

    function getCanvasXY(map, currentLatLng) {
        var scale = Math.pow(2, map.getZoom()),
            nw = new google.maps.LatLng(
                map.getBounds().getNorthEast().lat(), map.getBounds().getSouthWest().lng()
            ),
            worldCoordinateNW = map.getProjection()
                .fromLatLngToPoint(nw),
            worldCoordinate = map.getProjection()
                .fromLatLngToPoint(currentLatLng),
            currentLatLngOffset = new google.maps.Point(
                Math.floor((worldCoordinate.x - worldCoordinateNW.x) * scale),
                Math.floor((worldCoordinate.y - worldCoordinateNW.y) * scale)
            );
        return currentLatLngOffset;
    }

    function setMenuXY(map, currentLatLng) {
        var $canvas = $('#map_canvas'),
            $contextMenu = $('.contextmenu'),
            mapWidth = $canvas.width(),
            mapHeight = $canvas.height(),
            menuWidth = $contextMenu.width(),
            menuHeight = $contextMenu.height(),
            clickedPosition = getCanvasXY(map, currentLatLng),
            x = clickedPosition.x,
            y = clickedPosition.y;

        //if to close to the map border, decrease x position
        if ((mapWidth - x) < menuWidth) {
            x = x - menuWidth;
        }
        //if to close to the map border, decrease y position
        if ((mapHeight - y) < menuHeight) {
            y = y - menuHeight;
        }

        $contextMenu.css('left', x);
        $contextMenu.css('top', y);
    }

    function pointInCircle(point, radius, center) {
        return (google.maps.geometry.spherical.computeDistanceBetween(point, center) <= radius);
    }

    function isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    function getRandomColor() {
        var letters = '0123456789ABCDEF'.split('');
        var color = '#';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    function isGoodCoordinate(lat, lon, closePoint) {
        var validNumbers = isNumeric(lat) && isNumeric(lon),
            validPoint = true;
        if (validNumbers && closePoint) {
            validPoint = Math.abs(closePoint.lat() - Number(lat)) < 0.01 && Math.abs(closePoint.lng() - Number(
                        lon)) < 0.01
        }
        return validNumbers && validPoint;
    }

    function getMaxAnomalyScoreInRouteDataBetween(data, min, max) {
        var maxAnomaly = 0.0;
        _.each(data, function(point) {
            var t = point.timestamp;
            // console.log('%s < %s < %s (%s)', min, t, max, point.timestamp);
            if (min < t && t < max) {
                if (point.anomaly > maxAnomaly) {
                    maxAnomaly = point.anomaly;
                }
            }
        });
        return maxAnomaly;
    }

    function applyTimeWindowAnomalyColoring(routes, min, max) {
        _.each(routes, function(route) {
            var data = route.data,
                maxAnomaly = getMaxAnomalyScoreInRouteDataBetween(
                    data, min, max
                ),
                redGreen, color;
            if (maxAnomaly > 0.95) {
                redGreen = (maxAnomaly - 0.95) / 0.05;
            } else {
                redGreen = 0.0;
            }
            color = getGreenToRed(redGreen * 100);
            route.line.setOptions({
                strokeColor: '#' + color
            });
        });
    }

    function applyTimeWindowTrafficIncidentFiltering(markers, min, max) {
        _.each(markers, function(marker) {
            var t = marker.incidentTime,
                visible;
            // console.log('%s < %s < %s (%s)', min, t, max, point.timestamp);
            var visible = (min < t && t < max);
            marker.setVisible(visible);
        });
    }

    /* </ BAG OF FUNCTIONS > */


    /**
     * This encapsulates a Google Map and does traffi-related stuff.
     * @param elementId to render map
     * @param baseurl where's the data?
     * @param markerTemplate for marker InfoWindow (html)
     * @param options Google Map options
     * @constructor
     */
    function TrafficMap(elementId, baseurl, markerTemplate, options) {
        this.baseurl = baseurl;
        this.markerTemplate = markerTemplate;
        this.map = new google.maps.Map(
            document.getElementById(elementId), options
        );

        this.map.fitBounds(
            new google.maps.LatLngBounds(
                new google.maps.LatLng(40.5202, -74.2713),
                new google.maps.LatLng(40.8944, -73.5950)
            )
        );
    }

    TrafficMap.prototype.enableSearchBox = function(inputId) {
        var me = this,
            map = this.map,
            input, searchBox;

        me.searchMarkers = []

        input = (document.getElementById(inputId));
        map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

        searchBox = new google.maps.places.SearchBox((input));

        // Listen for the event fired when the user selects an item from the
        // pick list. Retrieve the matching places for that item.
        google.maps.event.addListener(searchBox, 'places_changed', function() {
            var places, image, marker, bounds;

            places = searchBox.getPlaces();

            if (places.length == 0) {
                return;
            }
            // Remove the old ones.
            _.each(me.searchMarkers, function(marker) {
                marker.setMap(null);
            });

            // For each place, get the icon, place name, and location.
            me.searchMarkers = [];
            bounds = new google.maps.LatLngBounds();
            _.each(places, function(place) {
                image = {
                    url: place.icon,
                    size: new google.maps.Size(71, 71),
                    origin: new google.maps.Point(0, 0),
                    anchor: new google.maps.Point(17, 34),
                    scaledSize: new google.maps.Size(25, 25)
                };

                // Create a marker for each place.
                marker = new google.maps.Marker({
                    map: map,
                    icon: image,
                    title: place.name,
                    position: place.geometry.location
                });

                me.searchMarkers.push(marker);

                bounds.extend(place.geometry.location);
            });

            map.fitBounds(bounds);

            this.map = map;
        });

        // Bias the SearchBox results towards places that are within the bounds of the
        // current map's viewport.
        google.maps.event.addListener(map, 'bounds_changed', function() {
            searchBox.setBounds(map.getBounds());
        });

    };

    TrafficMap.prototype.enableRightClickSearch = function() {
        var me = this;
        google.maps.event.addListener(me.map, "rightclick", function(event) {
            me._showContextMenu(event.latLng);
        });
        google.maps.event.addListener(me.map, 'bounds_changed', function() {
            $('.contextmenu').remove();
            if (me.circle) {
                me.circle.setMap(null);
            }
        });

    };

    TrafficMap.prototype.setRoutePaths = function(paths) {
        var me = this,
            markerTemplate = me.markerTemplate;

        me.routes = [];
        me.routeMarkers = [];

        _.each(paths, function(pathData, pathId) {
            var linkStrings = pathData.linkPoints.trim().split(/\s+/),
                coords = [],
                lastCoord, trafficRoute, marker, contentString, color = getRandomColor(),
                infoWindow;

            _.each(linkStrings, function(point) {
                var points = point.split(','),
                    lat = points.shift(),
                    lon = points.shift();

                // The coordinate data from NYCDOT is incomplete.
                if (isGoodCoordinate(lat, lon, lastCoord)) {
                    lastCoord = new google.maps.LatLng(
                        Number(lat), Number(lon)
                    );
                    coords.push(lastCoord);
                } else {
                    // console.log('Skipped %s coordinate "%s"', pathId, point)
                }

            });

            trafficRoute = new google.maps.Polyline({
                path: coords,
                geodesic: true,
                strokeColor: color,
                strokeOpacity: 1.0,
                strokeWeight: 3
            });

            marker = new google.maps.Marker({
                position: coords[0],
                map: me.map,
                title: 'Route ' + pathId,
                icon: me.baseurl + '/images/road.png'
            });

            contentString = Handlebars.compile(markerTemplate)({
                title: 'Route ' + pathId,
                subtitle: pathData.Borough,
                description: pathData.linkName,
                id: pathId
            });

            infoWindow = new google.maps.InfoWindow({
                content: contentString
            });

            google.maps.event.addListener(marker, 'click', function() {
                infoWindow.open(me.map, marker);
            });

            me.routes.push({
                id: pathId,
                line: trafficRoute,
                details: pathData
            });
            trafficRoute.setMap(me.map);

            me.routeMarkers.push(marker);

        });
    };

    TrafficMap.prototype.setIncidents = function(incidents) {
        var me = this,
            markerTemplate = me.markerTemplate;

        me.incidentMarkers = [];
        _.each(incidents, function(incident) {
            var coords, trafficMarker, contentString, info;

            coords = new google.maps.LatLng(
                incident.latitude, incident.longitude
            );

            trafficMarker = new google.maps.Marker({
                position: coords,
                map: me.map,
                title: incident.event_type,
                icon: me.baseurl + '/images/caraccident.png'
            });
            trafficMarker.incidentTime = incident.datetime;

            contentString = Handlebars.compile(markerTemplate)({
                title: incident.event_type + ' ' + incident.begins,
                subtitle: incident.event_status,
                description: incident.description || incident.begins
            });

            info = new google.maps.InfoWindow({
                content: contentString
            });

            google.maps.event.addListener(trafficMarker, 'click', function() {
                info.open(me.map, trafficMarker);
            });

            me.incidentMarkers.push(trafficMarker);
        });
    };

    TrafficMap.prototype.setMarkersVisible = function(type, visible) {
        var markers;
        if (type == 'routes') {
            markers = this.routeMarkers;
        } else if (type == 'incidents') {
            markers = this.incidentMarkers;
        }
        _.each(markers, function(m) {
            m.setVisible(visible);
        });
    };

    TrafficMap.prototype.setMinMaxTime = function(min, max) {
        this.minTime = min;
        this.maxTime = max;
        applyTimeWindowAnomalyColoring(this.routes, min, max);
        applyTimeWindowTrafficIncidentFiltering(this.incidentMarkers, min, max);
    };


    TrafficMap.prototype._showContextMenu = function(currentLatLng) {
        var me = this,
            contextmenuDir, baseurl = this.baseurl,
            map = this.map,
            searchRadius = (1 / map.getZoom()) * 50000,
            nearbyRoutes = [],
            plotLink = baseurl + '/charts/?id=';

        $('.contextmenu').remove();

        if (this.circle) {
            this.circle.setMap(null);
        }

        this.circle = new google.maps.Circle({
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FF0000',
            fillOpacity: 0.35,
            map: map,
            center: currentLatLng,
            radius: searchRadius
        });

        _.each(this.routeMarkers, function(rte) {
            if (pointInCircle(rte.getPosition(), me.circle.getRadius(), me.circle.getCenter())) {
                nearbyRoutes.push(rte);
            }
        });

        plotLink += _.map(nearbyRoutes, function(marker) {
            var title = marker.getTitle(),
                id = title.split(/\s+/).pop();
            return id;
        }).join(',');

        if (this.minTime) {
            plotLink += '&since=' + this.minTime.unix();
        }
        if (this.maxTime) {
            plotLink += '&until=' + this.maxTime.unix();
        }

        contextmenuDir = document.createElement("div");
        contextmenuDir.className = 'contextmenu';
        contextmenuDir.innerHTML =
            '<a href="' + plotLink + '" target="_blank">' +
            '<div class="context">Chart routes within cirle<\/div>' + '<\/a>';
        $(map.getDiv()).append(contextmenuDir);
        setMenuXY(map, currentLatLng);
        contextmenuDir.style.visibility = "visible";
    };

    window.TrafficMap = TrafficMap;

});