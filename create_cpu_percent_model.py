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

"""Create the cpu percent model.  See also send_cpu.py and README.md."""

from htmengine.adapters.datasource import createDatasourceAdapter



modelSpec = {
  "datasource": "custom",
  "metricSpec": {
    "metric": "cpu_percent"
  },
  "modelParams": {
    "min": 0,  # optional
    "max": 100  # optional
  }
}

adapter = createDatasourceAdapter(modelSpec["datasource"])
modelId = adapter.monitorMetric(modelSpec)

print "Model", modelId, "created..."
