This HTM Engine application was built from the [Skeleton HTM Engine App](https://github.com/nupic-community/skeleton-htmengine-app). It is like a scaffolding with an HTM Engine ready to run after a few configuration changes. It is _**the**_ place to start if you want to create a new HTM Engine application. See its README for more details.

# Setup

## 1. Install and Start Required Services

Install the following services appropriately for your environment:

- [MySQL](https://www.mysql.com/)
- [RabbitMQ](https://www.rabbitmq.com/)
- [Supervisor](http://supervisord.org/)

Go ahead and start the MySQL server and RabbitMQ, but not Supervisor.

## 2. Install HTM Engine and NTA Utils

Clone https://github.com/numenta/numenta-apps locally. 

You'll need to install `nta.utils`, which is a dependency of `htmengine`:

```
cd numenta-apps/nta.utils
python setup.py develop --user
```

Then you can install `htmengine` in development mode:

```
cd numenta-apps/htmengine
python setup.py develop --user
```


## 3. Install Required Python Modules

Now, back in your `htmengine-traffic-tutorial` directory:

    pip install -r python-engine/requirements.txt


## 4. Set `APPLICATION_CONFIG_PATH` in your environment

The `APPLICATION_CONFIG_PATH` environment variable must be set, and point to the `htmengine-traffic-tutorial/python-engine/conf/` directory.  For example, if you're in the the `htmengine-traffic-tutorial` directory:

```
export APPLICATION_CONFIG_PATH=`pwd`/python-engine/conf
```

## 5. Create a MySQL database

For this tutorial, we'll be using a database called `traffic`:

```
mysql -u root --execute="CREATE DATABASE traffic"
```

## 6. Apply database migrations

This will set up the `traffic` database by creating the appropriate table schema for the application.

Again, from the `htmengine-traffic-tutorial` directory:

```
python python-engine/repository/migrate.py
```
## 7. Update Two Config Files

In `python-engine/conf/supervisord.conf`, there are two places where absolute paths need to be updated. Look for the string `/Users/mtaylor/nta/` and replace with your local path to your `htmeengine-traffic-tutorial` checkout.

In `python-engine/conf/model-checkpoint.conf`, update the `storage.root` value to point to a directory within your own file system. If this folder does not exist, it will be created.

## 8. Start services with supervisor

This time, you must be in the `htmengine-traffic-tutorial/python-engine` directory:

```
cd python-engine
mkdir logs
supervisord -c conf/supervisord.conf
```

At this point, the core `htmengine` services are running.  You can see the supervisor status at <http://localhost:9001/> or by running
`supervisorctl status`.

To stop supervisord services, run `supervisorctl stop all`.

# Continue

The HTM Engine server is now running. You may now continue setup within the
primary [README](../README.md#start-htm-http-server-python) of this repository.
