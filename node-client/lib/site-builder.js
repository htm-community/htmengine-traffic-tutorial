var path = require('path')
  , fs = require('fs-extra')
  , _ = require('lodash')
  , Metalsmith = require('metalsmith')
  , templates = require('metalsmith-in-place')
  , layouts = require('metalsmith-layouts')
  , permalinks = require('metalsmith-permalinks')
  , config = require('../conf/config')
  , source = '../site'
  , destination = '../build'
  , layoutDir = path.join(__dirname, source, 'layouts')
  , buildDir = path.join(__dirname, destination)
  ;

module.exports = function(pathIds) {
    var baseurl = config.host;
    if (config.port && _.contains(config.host, 'localhost')) {
        baseurl += ':' + config.port;
    }
    // Ensure clean build.
    fs.removeSync(buildDir);
    Metalsmith(__dirname)
        .source(source)
        .destination(destination)
        .use(templates({
            engine: 'handlebars'
          , pattern: '*.html'
          , baseurl: baseurl
          , paths: pathIds
        }))
        .use(layouts({
            engine: 'handlebars'
          , directory: layoutDir
          , partials: {
                header: 'partials/header'
              , footer: 'partials/footer'
          }
          , baseurl: baseurl
        }))
        .use(permalinks({relative: false}))
        .build(function(error) {
            if (error) {
                console.error(error);
                process.exit(-1);
            }
        });
};
