module.exports = {

    port: process.env.PORT || 8083
  , host: process.env.BASE_URI || 'http://localhost'

    // This application expects https://github.com/rhyolight/nyc-traffic-service
    // to be running on this dataServer:
  , dataServer: 'http://sheltered-oasis-4180.herokuapp.com'
    // dataServer: 'http://localhost:8081'

  , interval: '10 minutes'
  , anomalyThreshhold: 0.99

    // This helps for debugging without pulling in the entire dataset.
  , maxPaths: 0

};
