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
