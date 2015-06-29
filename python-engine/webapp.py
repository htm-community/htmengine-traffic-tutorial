#!/usr/bin/env python
# ----------------------------------------------------------------------
# Numenta Platform for Intelligent Computing (NuPIC)
# Copyright (C) 2015, Numenta, Inc.  Unless you have purchased from
# Numenta, Inc. a separate commercial license for this software code, the
# following terms and conditions apply:
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License version 3 as
# published by the Free Software Foundation.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# See the GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see http://www.gnu.org/licenses.
#
# http://numenta.org/licenses/
# ----------------------------------------------------------------------

import calendar
import json
import os

from gevent import pywsgi
from cgi import parse_qs

from nta.utils import message_bus_connector
from nta.utils.config import Config

from htmengine import repository
from htmengine.adapters.datasource import createDatasourceAdapter
from htmengine.exceptions import MetricAlreadyMonitored
from htmengine.repository import schema



appConfig = Config("application.conf", os.environ["APPLICATION_CONFIG_PATH"])
MESSAGE_QUEUE_NAME = appConfig.get("metric_listener", "queue_name")
bus = message_bus_connector.MessageBusConnector()



def sendSample(bus, metricName, value, epochTimestamp):
  singleDataPoint = "%s %r %d" % (metricName, value, epochTimestamp)
  msg = json.dumps(dict(protocol="plain", data=[singleDataPoint]))
  bus.publish(mqName=MESSAGE_QUEUE_NAME, body=msg, persistent=True)



def handler(environ, start_response):
  metricName = environ["PATH_INFO"]

  if environ["REQUEST_METHOD"] == "PUT":
    # Trigger model creation...

    modelSpec = {
      "datasource": "custom",
      "metricSpec": {
        "metric": metricName
      },
      "modelParams": {}
    }

    try:
      modelSpec["modelParams"].update(json.load(environ["wsgi.input"]))
    except Exception as e:
      print e
      start_response("400 Bad Request", [("Content-Type", "text/html")])
      yield "Unable to parse request"

    adapter = createDatasourceAdapter(modelSpec["datasource"])
    try:
      modelId = adapter.monitorMetric(modelSpec)
      start_response("201 Created", [("Content-Type", "text/html")])
      yield "Created %s\n" % modelId

    except MetricAlreadyMonitored:
      start_response("400 Bad Request", [("Content-Type", "text/html")])
      yield "Model already exists for %s" % metricName
  elif environ["REQUEST_METHOD"] == "POST":
    # Send data...

    start_response("200 OK", [("Content-Type", "text/html")])

    for sample in environ["wsgi.input"]:
      value, ts = sample.split(" ")
      sendSample(bus, metricName=metricName, value=float(value),
                 epochTimestamp=int(ts))

      yield "Saved %s %f @ %d\n" % (metricName, float(value), int(ts))
  elif environ["REQUEST_METHOD"] == "GET":
    # parameters = parse_qs(environ.get('QUERY_STRING', ''))
    # print parameters
    # if 'since' in parameters:
    #   since = parameters['since'][0]
    with repository.engineFactory(appConfig).connect() as conn:
      fields = (schema.metric_data.c.metric_value,
                schema.metric_data.c.timestamp,
                schema.metric_data.c.rowid,
                schema.metric_data.c.anomaly_score)
      sort = schema.metric_data.c.timestamp.asc()

      metricObj = repository.getCustomMetricByName(conn, metricName, fields=[
        schema.metric.c.uid])

      result = repository.getMetricData(conn,
                                        metricId=metricObj.uid,
                                        fields=fields,
                                        sort=sort)

      start_response("200 OK", [("Content-Type", "text/html")])

      for row in result:
        yield " ".join((
          metricName,
          str(row.metric_value),
          str(calendar.timegm(row.timestamp.timetuple())),
          str(row.anomaly_score))) + "\n"


server = pywsgi.WSGIServer(('', 8080), handler)

server.serve_forever()
