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

"""timestatmp to datetime

Revision ID: 1d2eddc43366
Revises: 57ab75d58038
Create Date: 2014-12-30 15:58:52.062058
"""

from alembic import op
import sqlalchemy as sa


# Revision identifiers, used by Alembic. Do not change.
revision = '1d2eddc43366'
down_revision = '57ab75d58038'



def upgrade():
  """ Change tables to use DATETIME column types instead of TIMESTAMP """
  # Change tables to use DATETIME column types instead of TIMESTAMP
  op.alter_column("instance_status_history", "timestamp",
                  type_=sa.DATETIME,
                  existing_nullable=False,
                  existing_server_default=sa.text("'0000-00-00 00:00:00'"))

  op.alter_column("metric", "last_timestamp",
                  type_=sa.DATETIME,
                  existing_nullable=True,
                  existing_server_default=sa.text("NULL"))

  op.alter_column("metric_data", "timestamp",
                  type_=sa.DATETIME,
                  existing_nullable=False)
  ### end Alembic commands ###



def downgrade():
  raise NotImplementedError("Rollback is not supported.")
