This HTM Engine application was build from the [Skeleton HTM Engine App](https://github.com/nupic-community/skeleton-htmengine-app). It is like a scaffolding with an HTM Engine ready to run after a few configuration changes. It is _**the**_ place to start if you want to create a new HTM Engine application. See its README for more details.

# Setup

## 1. Install and Start Required Services

- [MySQL](https://www.mysql.com/)
- [RabbitMQ](https://www.rabbitmq.com/)

## 2. Install HTM Engine and NTA Utils

Clone https://github.com/numenta/numenta-apps locally. Then you can install
`htmengine` in development mode:

```
cd numenta-apps/htmengine
python setup.py develop --user
```

You'll also need to install `nta.utils`, which is a dependency of `htmengine`:

```
cd numenta-apps/nta.utils
python setup.py develop --user
```

## 3. Install Required Python Modules

Now, back in your `htmengine-traffic-tutorial` directory:

    pip install -r python-engine/requirements.txt


## 4. Create a MySQL database

For this tutorial, we'll be using a database called `traffic`:

```
mysql -u root --execute="CREATE DATABASE traffic"
```

## 5. Apply database migrations

This will set up the `traffic` database by creating the appropriate table schema for the application.

Again, from the `htmengine-traffic-tutorial` directory:

```
python python-engine/repository/migrate.py
```

## 6. Set `APPLICATION_CONFIG_PATH` in your environment

The `APPLICATION_CONFIG_PATH` environment variable must be set, and point to the `htmengine-traffic-tutorial/python-engine/conf/` directory.  For example, if you're in the the `htmengine-traffic-tutorial` directory:

```
export APPLICATION_CONFIG_PATH=`pwd`/python-engine/conf
```

## 7. Start services with supervisor

Again, from the `htmengine-traffic-tutorial` directory:

```
mkdir python-engine/logs
supervisord -c python-engine/conf/supervisord.conf
```

At this point, the core `htmengine` services are running.  You can see the supervisor status at <http://localhost:9001/> or by running
`supervisorctl status`.

To stop supervisord services, run `supervisorctl stop all`.

# Continue

The HTM Engine server is now running. You may now continue setup within the
primary [README](../README.md) of this repository.
