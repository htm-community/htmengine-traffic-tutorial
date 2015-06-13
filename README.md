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

If you look in the `metric_data` MySQL table, you should start to see new
records come in.

For example:

```
$ mysql -u root skeleton --execute="select * from metric_data order by rowid desc limit 5"
+----------------------------------+-------+---------------------+--------------+-------------------+---------------+---------------+
| uid                              | rowid | timestamp           | metric_value | raw_anomaly_score | anomaly_score | display_value |
+----------------------------------+-------+---------------------+--------------+-------------------+---------------+---------------+
| 4258abfc6de947609f821095471dd0a2 |    94 | 2015-06-13 04:01:55 |          5.6 |              NULL |          NULL |          NULL |
| 4258abfc6de947609f821095471dd0a2 |    93 | 2015-06-13 04:01:50 |          7.4 |              NULL |          NULL |          NULL |
| 4258abfc6de947609f821095471dd0a2 |    92 | 2015-06-13 04:01:45 |          4.1 |              NULL |          NULL |          NULL |
| 4258abfc6de947609f821095471dd0a2 |    91 | 2015-06-13 04:01:40 |          3.7 |              NULL |          NULL |          NULL |
| 4258abfc6de947609f821095471dd0a2 |    90 | 2015-06-13 04:01:35 |          4.5 |              NULL |          NULL |          NULL |
+----------------------------------+-------+---------------------+--------------+-------------------+---------------+---------------+
```

Notice that only `uid`, `rowid`, `timestamp`, and `metric_value` are populated.
The next step will be to explicitly create a model for the `cpu_percent` metric
so that `raw_anomaly_score` and `anomaly_score` may be populated with anomaly
scores.

```
python create_cpu_percent_model.py
```

Then, check the database again, and you should see anomaly scores:

```
$ mysql -u root skeleton --execute="select * from metric_data order by rowid desc limit 5"
+----------------------------------+-------+---------------------+--------------+-------------------+---------------+---------------+
| uid                              | rowid | timestamp           | metric_value | raw_anomaly_score | anomaly_score | display_value |
+----------------------------------+-------+---------------------+--------------+-------------------+---------------+---------------+
| 4258abfc6de947609f821095471dd0a2 |   344 | 2015-06-13 04:23:11 |         10.5 |             0.075 |   0.344578258 |          1000 |
| 4258abfc6de947609f821095471dd0a2 |   343 | 2015-06-13 04:23:06 |          9.6 |              0.05 |   0.184060125 |          1000 |
| 4258abfc6de947609f821095471dd0a2 |   342 | 2015-06-13 04:23:01 |          8.4 |              0.05 |    0.11506967 |          1000 |
| 4258abfc6de947609f821095471dd0a2 |   341 | 2015-06-13 04:22:56 |          9.4 |              0.05 |   0.080756659 |          1000 |
| 4258abfc6de947609f821095471dd0a2 |   340 | 2015-06-13 04:22:51 |          7.6 |                 0 |   0.044565463 |          1000 |
+----------------------------------+-------+---------------------+--------------+-------------------+---------------+---------------+
```

You can query the `metric` table to get status on the model.  You'll know
everything is working when `status` is `1`:

```
$ mysql -u root skeleton --execute="select uid, name, description, status from metric where name = 'cpu_percent'"
+----------------------------------+-------------+---------------------------+--------+
| uid                              | name        | description               | status |
+----------------------------------+-------------+---------------------------+--------+
| 4258abfc6de947609f821095471dd0a2 | cpu_percent | Custom metric cpu_percent |      1 |
+----------------------------------+-------------+---------------------------+--------+
```
