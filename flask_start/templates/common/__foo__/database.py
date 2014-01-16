# -*- coding: utf-8 -*-
from genuine_ap.basemain import app
from flask.ext.sqlalchemy import SQLAlchemy
db = SQLAlchemy(app)


def init_db():
    # 必须要import models, 否则不会建立表
    import genuine_ap.models
    db.create_all()
