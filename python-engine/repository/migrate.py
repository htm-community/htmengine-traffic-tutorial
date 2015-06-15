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

"""Perform database migration."""

import optparse
import os

import alembic
import alembic.config



ALEMBIC_CONFIG = alembic.config.Config(
  os.path.join(os.path.abspath(os.path.dirname(__file__)),
               "migrations",
               "alembic.ini")
)



def migrate(version="head", offline=False):
  """
  :param offline: False to execute SQL commands; True to just dump SQL commands
    to stdout for offline mode or debugging
  """
  alembic.command.upgrade(ALEMBIC_CONFIG, version, sql=offline)



if __name__ == "__main__":
  parser = optparse.OptionParser()
  parser.add_option("--version", default="head")
  parser.add_option(
      "--offline",
      action="store_true",
      default=False,
      dest="offline",
      help=("Use this flag to dump sql commands to stdout instead of executing "
            "them."))
  options, _ = parser.parse_args()

  migrate(options.version, offline=options.offline)
