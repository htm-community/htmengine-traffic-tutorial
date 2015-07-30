This HTM Engine application was build from the [Skeleton HTM Engine App](https://github.com/nupic-community/skeleton-htmengine-app). It is like a scaffolding with an HTM Engine ready to run after a few configuration changes. It is _**the**_ place to start if you want to create a new HTM Engine application. See its README for more details.

# Setup

First, this assumes you have a fresh checkout of the `numenta-apps` repository
from https://github.com/numenta/numenta-apps. Clone that repository, and follow the [HTM Engine README installation instructions](https://github.com/numenta/numenta-apps/tree/master/htmengine) (_requires RabbitMQ and MySQL!_). Then you can install
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

## 1. Create a MySQL database

For this tutorial, we'll be using a database called `traffic`:

```
mysql -u root --execute="CREATE DATABASE traffic"
```

## 2. Set APPLICATION_CONFIG_PATH in your environment

`APPLICATION_CONFIG_PATH` must be set, and include the path to the config files
in the `conf/` directory.  For example, if you're in the the `python-engine`
directory:

```
export APPLICATION_CONFIG_PATH=`pwd`/conf
```

## 4. Apply database migrations

Again, from the `python-engine` directory:

```
python repository/migrate.py
```

## 5. Start services with supervisor

Again, from the `python-engine` directory:

```
mkdir -p logs
supervisord -c conf/supervisord.conf
```

At this point, the core `htmengine` services are running.  You can see the
supervisor status at <http://localhost:9001/> or by running
`supervisorctl status`.

To stop supervisord services, run `supervisorctl stop all`.

# Continue

The HTM Engine server is now running. You may now continue setup within the
primary [README](../README.md) of this repository.
