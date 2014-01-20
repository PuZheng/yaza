# -*- coding: utf-8 -*-
from __package_name__.basemain import app
from flask.ext.sqlalchemy import SQLAlchemy
db = SQLAlchemy(app)


def init_db():
    # 必须要import models, 否则不会建立表
    import __package_name__.models
    db.create_all()
