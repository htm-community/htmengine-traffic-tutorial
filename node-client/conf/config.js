module.exports = {

    port: process.env.PORT || 8083
  , host: process.env.BASE_URI || 'http://localhost'

    // This application expects https://github.com/rhyolight/river-view
    // to be running at this URL:
  , riverViewUrl: 'https://river-view.herokuapp.com'
  , riverName: 'nyc-traffic'

  , interval: '10 minutes'
  , anomalyThreshhold: 0.99

    // This helps for debugging without pulling in the entire dataset.
  , maxPaths: 0

};
