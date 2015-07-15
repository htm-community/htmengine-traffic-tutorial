
module.exports = {

  port: process.env.PORT || 8083,
  host: process.env.BASE_URI || 'http://localhost',

  // This application expects https://github.com/rhyolight/river-view
  // to be running at this URL:
  riverViewUrl: 'https://river-view.herokuapp.com',
  riverName: 'nyc-traffic',

  // This applications expects a Python HTTP server around the HTM Engine
  // defined in ../../python-engine/webapp.py to be running at the URL below.
  htmEngineServerUrl: 'http://localhost:8080',

  interval: '10 minutes',
  anomalyThreshhold: 0.99,

  // How many traffic paths to pull. This helps for debugging without pulling
  // in the entire dataset. If "0", this is disregarded.
  maxPaths: 0

};