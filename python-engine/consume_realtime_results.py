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

"""Consume anomaly results in near realtime"""

import os

from nta.utils import amqp
from nta.utils.config import Config

from htmengine import htmengineerrno
from htmengine.runtime.anomaly_service import AnomalyService



appConfig = Config("application.conf", os.environ["APPLICATION_CONFIG_PATH"])

modelResultsExchange = appConfig.get("metric_streamer",
                                     "results_exchange_name")
queueName = "skeleton_results"



def declareExchanges(amqpClient):
  """ Declares model results and non-metric data exchanges
  """
  amqpClient.declareExchange(exchange=modelResultsExchange,
                             exchangeType="fanout",
                             durable=True)


def declareQueueAndBindToExchanges(amqpClient):
  """ Declares skeleton queue and binds to model results.
  """
  result = amqpClient.declareQueue(queueName, durable=True)

  amqpClient.bindQueue(exchange=modelResultsExchange,
                       queue=result.queue, routingKey="")


def configChannel(amqpClient):
  amqpClient.requestQoS(prefetchCount=1)



def handleModelInferenceResults(body):
  """ Model results batch handler.

  :param body: Serialized message payload; the message is compliant with
    htmengine/runtime/json_schema/model_inference_results_msg_schema.json.
  :type body: str
  """
  try:
    batch = AnomalyService.deserializeModelResult(body)
  except Exception:
    print "Error deserializing model result"
    raise

  metricId = batch["metric"]["uid"]
  metricName = batch["metric"]["name"]

  print "Handling %d model result(s) for %s - %s" % (len(batch["results"]),
                                                     metricId,
                                                     metricName)

  if not batch["results"]:
    print "Empty results in model inference results batch; model=%s" % metricId
    return

  print metricId, batch["results"]


def handleModelCommandResult(body):
  """ ModelCommandResult handler.  Handles model creation/deletion events

  :param body: Incoming message payload
  :type body: str
  """
  try:
    modelCommandResult = AnomalyService.deserializeModelResult(body)
  except Exception:
    print "Error deserializing model command result"
    raise

  if modelCommandResult["status"] != htmengineerrno.SUCCESS:
    return # Ignore...

  if modelCommandResult["method"] == "defineModel":
    print "Handling `defineModel` for %s" % modelCommandResult.get("modelId")
    print modelCommandResult

  elif modelCommandResult["method"] == "deleteModel":
    print "Handling `deleteModel` for %s" % modelCommandResult.get("modelId")
    print modelCommandResult


def messageHandler(message):
  """ Inspect all inbound model results

  We will key off of routing key to determine specific handler for inbound
  message.  If routing key is `None`, attempt to decode message using
  `AnomalyService.deserializeModelResult()`.

  :param amqp.messages.ConsumerMessage message: ``message.body`` is one of:
      Serialized batch of model inference results generated in
        ``AnomalyService`` and must be deserialized using
        ``AnomalyService.deserializeModelResult()``. Per
        htmengine/runtime/json_schema/model_inference_results_msg_schema.json

      Serialized ``ModelCommandResult`` generated in ``AnomalyService``
        per model_command_result_amqp_message.json and must be deserialized
        using ``AnomalyService.deserializeModelResult()``
  """
  if message.methodInfo.routingKey is None:
    print "Unrecognized routing key."
  else:
    dataType = (message.properties.headers.get("dataType")
                if message.properties.headers else None)
    if not dataType:
      handleModelInferenceResults(message.body)
    elif dataType == "model-cmd-result":
      handleModelCommandResult(message.body)
    else:
      print "Unexpected message header dataType=%s" % dataType

  message.ack()


if __name__ == "__main__":
  with amqp.synchronous_amqp_client.SynchronousAmqpClient(
      amqp.connection.getRabbitmqConnectionParameters(),
      channelConfigCb=configChannel) as amqpClient:

    declareExchanges(amqpClient)
    declareQueueAndBindToExchanges(amqpClient)
    consumer = amqpClient.createConsumer(queueName)

    # Start consuming messages
    for evt in amqpClient.readEvents():
      if isinstance(evt, amqp.messages.ConsumerMessage):
        messageHandler(evt)
      elif isinstance(evt, amqp.consumer.ConsumerCancellation):
        # Bad news: this likely means that our queue was deleted externally
        msg = "Consumer cancelled by broker: %r (%r)" % (evt, consumer)
        raise Exception(msg)
      else:
        print "Unexpected amqp event=%r" % evt
