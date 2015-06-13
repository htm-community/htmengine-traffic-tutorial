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

"""Simple demonstration sending CPU percent samples to htmengine"""

import json
import os
import sys
import time

import psutil

from nta.utils import message_bus_connector
from nta.utils.config import Config



appConfig = Config("application.conf", os.environ["APPLICATION_CONFIG_PATH"])
MESSAGE_QUEUE_NAME = appConfig.get("metric_listener", "queue_name")



def sendSample(bus, metricName, value, epochTimestamp):
  singleDataPoint = "%s %r %d" % (metricName, float(value), epochTimestamp)
  msg = json.dumps(dict(protocol="plain", data=[singleDataPoint]))
  bus.publish(mqName=MESSAGE_QUEUE_NAME, body=msg, persistent=True)


if __name__ == "__main__":
  bus = message_bus_connector.MessageBusConnector()
  metricName = "cpu_percent"

  print "Sending CPU percent samples to `%s`..." % metricName

  # Send cpu percent every 5 seconds, indefinitely...
  while True:
    sample = psutil.cpu_percent(interval=5)
    ts = int(time.time())
    sendSample(bus, metricName=metricName, value=sample, epochTimestamp=ts)
    print "Sent %f @ %d" % (sample, ts)
    sys.stdout.flush()
