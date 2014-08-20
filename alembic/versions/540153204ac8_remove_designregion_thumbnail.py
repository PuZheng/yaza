"""remove DesignRegion.thumbnail

Revision ID: 540153204ac8
Revises: None
Create Date: 2014-08-20 11:59:21.106382

"""
# revision identifiers, used by Alembic.
revision = '540153204ac8'
down_revision = None

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.drop_column('TB_ASPECT', 'thumbnail_path')


def downgrade():
    op.add_column('TB_ASPECT', sa.Column('thumbnail_path', sa.String()))
