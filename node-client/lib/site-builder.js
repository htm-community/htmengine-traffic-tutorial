/* This code builds out static files from the "/site" directory and
 * puts them into "/build". This includes HTML templates, JavaScript,
 * CSS, etc. Anything the browser might request.
 */
var path = require('path'),
    fs = require('fs-extra'),
    _ = require('lodash'),
    Metalsmith = require('metalsmith'),
    templates = require('metalsmith-in-place'),
    layouts = require('metalsmith-layouts'),
    permalinks = require('metalsmith-permalinks'),
    config = require('../conf/config'),
    source = '../site',
    destination = '../build',
    googleMapsApiKey = process.env['GOOGLE_MAPS_API_KEY'],
    layoutDir = path.join(__dirname, source, 'layouts'),
    buildDir = path.join(__dirname, destination);


function extractBoroughs(paths) {
    return _.unique(_.map(paths, function(p) {
        return p.Borough.toUpperCase();
    }));
}

/**
 * Builds out all static files using Metalsmith:
 * https://github.com/segmentio/metalsmith
 *
 * Reads files from 'site' and writes to 'build'. Handles templates, layouts.
 * Does some data preparation to the input data before passing them to
 * templates.
 *
 * @param pathDetails [list] all traffic path details
 * @param dataSourceUrl [string] URL to the source of the traffic data (river view url probably)
 * @param htmEngineServerUrl [string] URL to the HTM Engine HTTP server
 */
function buildStaticFiles(pathDetails, dataSourceUrl, htmEngineServerUrl) {
    var baseurl = config.host;
    if (config.port && _.contains(config.host, 'localhost')) {
        baseurl += ':' + config.port;
    }
    // Ensure clean build.
    fs.removeSync(buildDir);

    // This does the build.
    Metalsmith(__dirname)
        .source(source)
        .destination(destination)
        .use(templates({
            engine: 'handlebars',
            pattern: ['js/*.js', '*.html'],
            baseurl: baseurl,
            dataSourceUrl: dataSourceUrl,
            htmEngineServerUrl: htmEngineServerUrl,
            paths: pathDetails,
            boroughs: extractBoroughs(pathDetails),
            googleMapsApiKey: googleMapsApiKey
        }))
        .use(layouts({
            engine: 'handlebars',
            directory: layoutDir,
            partials: {
                header: 'partials/header',
                footer: 'partials/footer'
            },
            baseurl: baseurl
        }))
        .use(permalinks({
            relative: false
        }))
        .build(function(error) {
            if (error) {
                console.error(error);
                process.exit(-1);
            }
        });
}

module.exports = buildStaticFiles;
