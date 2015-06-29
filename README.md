This application has two or more parts.

## 1. HTM Engine Python Server

This server runs NuPIC within the [HTM Engine](https://github.com/numenta/numenta-apps/tree/master/htmengine). You must follow those installation instructions before this will work. Then you should start the server with supervisord (see the [README](https://github.com/numenta/numenta-apps/tree/master/htmengine)).

## 2. Node.js Client Application

This fetches the data, controls the HTM Engine via HTTP, pipes in mountains of data, displays results in webapp.

## 3. Data Service

This application is using a data service called [nyc-traffic-service](https://github.com/rhyolight/nyc-traffic-service), which is currently running at http://sheltered-oasis-4180.herokuapp.com. It explains itself in its README, too.

* * *

# BUILD YOUR OWN

at https://github.com/oxtopus/skeleton-htmengine-app

* * *

# Requires:

- [supervisord](http://supervisord.org/)
- [HTM Engine](https://github.com/numenta/numenta-apps/tree/master/htmengine), which also needs:
  - [NTA Utils](https://github.com/numenta/numenta-apps/tree/master/nta.utils)
  - [MySQL](https://www.mysql.com/)
  - [RabbitMQ](https://www.rabbitmq.com/)
( just do it )
- [Node.js](https://nodejs.org) & [NPM](http://npmjs.org) (hopefully it came with it)

# Startup

## HTM Engine (Python)

Be sure to install requirements.

    pip install -r python-engine/requirements.txt

Start supervisord from the `python-engine` folder.

    cd python-engine
    supervisord -c conf/supervisord.conf

## HTM HTTP Server (Python)

Provides a simple GET/POST/PUT HTTP interface on top of the HTM Engine.

    cd python-engine
    python webapp.py

This will run at http://localhost:8080.

## HTM Client (JavaScript)

    cd node-client
    npm install .
    npm start

This will run at http://localhost:8083. You only need to `npm install` once. 

* * *

This is a work in progress, something models are not starting.
