$(function() {

    var graphs = [];
    var query = getUrlQuery();

    $.get('{{ baseurl }}/templates/chartRow.hbt', function(rowTmpl) {

        function goChart(id, details) {
            var csvPath;

            details.baseurl = '{{baseurl}}';
            details.id = id;
            details.chartId = id;
            details.until = query.until;

            $('table.charts tbody').append(Handlebars.compile(rowTmpl)(details));

            csvPath = '/data/' + id + '?' + $.param(query);

            graphs.push(new Dygraph(
                document.getElementById("chart-" + id), csvPath, {
                    anomaly: {
                        color: "red",
                        strokeWidth: 2.0,
                        axis: {
                            valueRange: [0, 1.0]
                        }
                    },
                    axes: {
                        y: {
                            valueRange: [0, 80]
                        }
                    },
                    width: $('#container-' + id).width(),
                    height: 120,
                    underlayCallback: function(canvas, area, g) {
                        var yellow = "rgba(255, 255, 102, 1.0)";

                        function highlight_period(x_start, x_end) {
                            var canvas_left_x = g.toDomXCoord(x_start);
                            var canvas_right_x = g.toDomXCoord(x_end);
                            var canvas_width = canvas_right_x - canvas_left_x;
                            canvas.fillRect(canvas_left_x, area.y, canvas_width, area.h);
                        }

                        var min_data_x = g.getValue(0, 0);
                        var max_data_x = g.getValue(g.numRows() - 1, 0);

                        // get day of week
                        var d = new Date(min_data_x);
                        var dow = d.getUTCDay();

                        var w = min_data_x;
                        // starting on Sunday is a special case
                        if (dow === 0) {
                            highlight_period(w, w + 12 * 3600 * 1000);
                        }
                        // find first saturday
                        while (dow != 6) {
                            w += 24 * 3600 * 1000;
                            d = new Date(w);
                            dow = d.getUTCDay();
                        }
                        // shift back 1/2 day to center highlight around the point for the day
                        w -= 12 * 3600 * 1000;

                        canvas.fillStyle = yellow;
                        while (w < max_data_x) {
                            var start_x_highlight = w;
                            var end_x_highlight = w + 2 * 24 * 3600 * 1000;
                            // make sure we don't try to plot outside the graph
                            if (start_x_highlight < min_data_x) {
                                start_x_highlight = min_data_x;
                            }
                            if (end_x_highlight > max_data_x) {
                                end_x_highlight = max_data_x;
                            }
                            highlight_period(start_x_highlight, end_x_highlight);
                            // calculate start of highlight for next Saturday
                            w += 7 * 24 * 3600 * 1000;
                        }
                    }
                }
            ));
        }

        if (query.borough) {
            query.borough = query.borough.replace('%20', ' ');
            $('#this-crumb').html(query.borough + ' Charts');
        } else if (query.id) {
            $('#this-crumb').html('Route ' + query.id + ' Charts');
        }

        $.getJSON('{{ baseurl }}/data/pathDetails', query, function(data) {
            _.each(data.paths, function(pathData, pathId) {
                goChart(pathId, pathData);
            });
            var sync = Dygraph.synchronize(graphs, {
                selection: false,
                zoom: true
            });
            $('.hide-chart').click(function(event) {
                var id = $(event.target).data('chart');
                $('#chart-' + id + '-row').hide();
            });
        });

    });


});
