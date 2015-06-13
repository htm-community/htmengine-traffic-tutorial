So, you want to create an application with htmengine?!
======================================================

This is a bare-bones, minimal example for building an application on the
`htmengine` framework.  There are two important steps that must be done
in order to _use_ htmengine: Configure the application, and setup the
database.  Once you have completed the following instructions, you will have
a running `htmengine` application.  You may send data to the
graphite-compatible custom metrics interface, or send data directly into the
AMQP exchange, and receive real-time results from the model results exchange,
or by polling the database.

You will see in several instances the use of the word "skeleton".  That is the
_name_ of the app in this demonstration.  In all cases, you should replace
"skeleton" with the name that you've chosen for your application.  This value
is used in several places to segment resources by application, so that multiple
applications may use the same mysql and rabbitmq instance.

## Before you begin

First, this assumes you have a fresh checkout of the `numenta-apps` repository
at https://github.com/numenta/numenta-apps.  Clone that repository, and install
`htmengine` in development mode:

```
cd numenta-apps/htmengine
python setup.py develop --user
```

## 1. Create a MySQL database

For example:

```
mysql -u root --execute="CREATE DATABASE skeleton"
```

## 2. Edit configuration

### conf/application.conf

Inside `conf/application.conf`, you will find a section called `[repository]`,
edit the `db`, `host`, `user`, `passwd`, and `port` values to match the
database created in Step 1.

Elsewhere in `conf/application.conf`, replace "skeleton" with the name of your
application.  That includes `results_exchange_name` under `[metric_streamer]`,
and `queue_name` in `[metric_listener]`.

### conf/model-checkpoint.conf

Inside `conf/model-checkpoint.conf`, specify an absolute path on your
filesystem for permanent storage of model checkpoints in `root` of `[storage]`.

### conf/model-swapper.conf

Inside `conf/model-swapper.conf`, replace "skeleton" with the name of your
application in `results_queue`, `model_input_queue_prefix`, and
`scheduler_notification_queue` of the `[interface_bus]` section.

### conf/supervisord.conf

Inside `conf/supervisord.conf`, specify the path to the configuration directory
in the `environment` value of the `[supervisord]` section.  Specify the path to
the `supervisord-base.conf` bundled with the original `htmengine` installation.
For example, if you cloned the `numenta-apps` repository at
`/Users/user/numenta-apps`, the value should be
`/Users/user/numenta-apps/htmengine/conf/supervisord-base.conf`.

## 3. Set APPLICATION_CONFIG_PATH in your environment

`APPLICATION_CONFIG_PATH` must be set, and include the path to the config files
mentioned in #2.  For example, if you're in the root of this project:

```
export APPLICATION_CONFIG_PATH=`pwd`/conf
```

## 4. Apply database migrations

Again, from the root of this project:

```
python repository/migrate.py
```

## 5. Start services with supervisor

Again, from the root of this project:

```
mkdir -p logs
supervisord -c conf/supervisord.conf
```

At this point, the core `htmengine` services are running.

## Usage

A sample `send_cpu.py` script is included demonstrating how to send data into
`htmengine` for processing using the `message_bus_connector` API.

```
python send_cpu.py
```

`send_cpu.py` will run indefinitely, sending cpu percent samples every 5
seconds into the custom metrics queue for processing by htmengine.  In practice
you should use something like `nohup` to keep this process running in the
background:

```
nohup python send_cpu.py > send_cpu.stdout 2> send_cpu.stderr < /dev/null &
```
