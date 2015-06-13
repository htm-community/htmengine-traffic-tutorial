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

You'll also need to install `nta.utils`, which is a dependency of `htmengine`:

```
cd numenta-apps/nta.utils
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

At this point, the core `htmengine` services are running.  You can see the
supervisor status at <http://localhost:9001/> or by running
`supervisorctl status`.

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

Additionally, you can consume the anomaly results in near realtime with the
included `consume_realtime_results.py` script.

```
$ python consume_realtime_results.py
Handling 1 model result(s) for 4258abfc6de947609f821095471dd0a2 - cpu_percent
4258abfc6de947609f821095471dd0a2 [{u'rowid': 749, u'rawAnomaly': 0.0, u'anomaly': 0.04456546299999997, u'ts': 1434174392.0, u'value': 8.0}]
Handling 1 model result(s) for 4258abfc6de947609f821095471dd0a2 - cpu_percent
4258abfc6de947609f821095471dd0a2 [{u'rowid': 750, u'rawAnomaly': 0.0, u'anomaly': 0.04456546299999997, u'ts': 1434174397.0, u'value': 9.6}]
Handling 1 model result(s) for 4258abfc6de947609f821095471dd0a2 - cpu_percent
4258abfc6de947609f821095471dd0a2 [{u'rowid': 751, u'rawAnomaly': 0.0, u'anomaly': 0.04456546299999997, u'ts': 1434174402.0, u'value': 7.3}]
Handling 1 model result(s) for 4258abfc6de947609f821095471dd0a2 - cpu_percent
4258abfc6de947609f821095471dd0a2 [{u'rowid': 752, u'rawAnomaly': 0.0, u'anomaly': 0.04456546299999997, u'ts': 1434174407.0, u'value': 8.1}]
Handling 1 model result(s) for 4258abfc6de947609f821095471dd0a2 - cpu_percent
4258abfc6de947609f821095471dd0a2 [{u'rowid': 753, u'rawAnomaly': 0.0, u'anomaly': 0.04456546299999997, u'ts': 1434174412.0, u'value': 7.0}]
...
```

## That's cool, and all, but I want an HTTP API!

See webapp.py for a minimal web service implementation that implements the
above described steps in the form of HTTP calls.

First, run the web service:

```
python webapp.py
```

Then, to create a model, send a `PUT` request to the web service on port 8080.
The URI represents the metric name, and you may optionall speciy model params
in the request body.  Using curl on the command line:

```
$ curl http://localhost:8080/load_average -X PUT -d '{"min":0, "max":12}' -i
HTTP/1.1 201 Created
Content-Type: text/html
Date: Sat, 13 Jun 2015 21:01:40 GMT
Transfer-Encoding: chunked

Created 6e1f199a74274c5cbf9443f4ab4ad94e
```

*Note* you may create the model at any time during the process.  For example,
you may send data (described below) over an extended period of time, and then
trigger the creation of the model at a later time.  In the example above, the
`min` and `max` is included, but that value may not be known.  Sometimes it is
better to omit the min and max and let htmengine choose a value based on the
history of a metric.

To send data, send a `POST` request to the same URL you used to create the
model.  The body of the request must consist of two values: metric value and
timestamp separated by a single space.  The example below sends load average
data using curl in an infinite loop at 5 second intervals:

```
$ while true; do while true; do echo "`(uptime | awk -F'[a-z]:' '{ print $2}' | awk '{print $1}')` `date +%s`" | curl http://localhost:8080/load_average -X POST -d @-; sleep 5; done; done
Saved /load_average 1.620000 @ 1434229721
Saved /load_average 1.730000 @ 1434229726
Saved /load_average 1.590000 @ 1434229731
Saved /load_average 1.540000 @ 1434229736
Saved /load_average 1.420000 @ 1434229741
```

To retrieve data, `GET` data from the same original URL:

```
$ curl http://localhost:8080/load_average
/load_average 1.7 1434229625 0.0
/load_average 1.72 1434229628 0.0
/load_average 1.72 1434229629 0.0
/load_average 1.72 1434229630 0.0
/load_average 1.71 1434229704 0.0
/load_average 1.73 1434229709 0.0
/load_average 1.62 1434229721 0.0
/load_average 1.73 1434229726 0.0
/load_average 1.59 1434229731 0.0
/load_average 1.54 1434229736 0.0
/load_average 1.42 1434229741 0.0
```

The right-most column in the response is the anomaly score.  The first three
columns are the original data.

*Disclaimer* this web app is only a simple demonstration wrapping htmengine in
a minimal web service and is not production-ready.

## Final notes

This demonstration represents only the minimal amount of work to bring an
application online using `htmengine`.  Numenta have done a substantial amount
of work in making much of the concepts demonstrated here robust and suitable
for a production workload in our showcase applications Grok, and Taurus.  If
you're interested in learning more, please see
[Grok](https://github.com/numenta/numenta-apps/tree/master/grok),
[Taurus Engine](https://github.com/numenta/numenta-apps/tree/master/taurus),
and [Taurus Metric Collectors](https://github.com/numenta/numenta-apps/tree/master/taurus.metric_collectors)

Thanks!
