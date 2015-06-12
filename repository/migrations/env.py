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

"""Script running the actual migrations."""

from alembic import context
import os
from sqlalchemy import engine_from_config, pool
from logging.config import fileConfig

from nta.utils.config import Config

from htmengine import repository
from htmengine.repository import schema

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
CONFIG = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
fileConfig(CONFIG.config_file_name)

# Used for autogenerating migrations.
TARGET_METADATA = schema.metadata

appConfig = Config("application.conf", os.environ["APPLICATION_CONFIG_PATH"])

def runMigrationsOffline():
  """Run migrations in 'offline' mode.

  See Alembic documentation for more details on these functions.

  This configures the context with just a URL
  and not an Engine, though an Engine is acceptable
  here as well.  By skipping the Engine creation
  we don't even need a DBAPI to be available.

  Calls to context.execute() here emit the given string to the
  script output.
  """
  context.configure(url=repository.getDbDSN(appConfig),
                    target_metadata=TARGET_METADATA)

  with context.begin_transaction():
    context.run_migrations()



def runMigrationsOnline():
  """Run migrations in 'online' mode.

  See Alembic documentation for more details on these functions.

  In this scenario we need to create an Engine
  and associate a connection with the context.
  """
  CONFIG.set_main_option("sqlalchemy.url", repository.getDbDSN(appConfig))

  engine = engine_from_config(
      CONFIG.get_section(CONFIG.config_ini_section),
      prefix="sqlalchemy.",
      poolclass=pool.NullPool)

  connection = engine.connect()
  context.configure(
    connection=connection,
    target_metadata=TARGET_METADATA
  )

  try:
    with context.begin_transaction():
      context.run_migrations()
  finally:
    connection.close()



if context.is_offline_mode():
  runMigrationsOffline()
else:
  runMigrationsOnline()
