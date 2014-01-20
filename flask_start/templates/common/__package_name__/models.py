# -*- coding: UTF-8 -*-
from datetime import datetime

from flask.ext.babel import _
from .database import db


class User(db.Model):

    __tablename__ = 'TB_USER'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)
    password = db.Column(db.String(128), doc=u'保存为明文密码的sha256值')
    group_id = db.Column(db.Integer, db.ForeignKey('TB_GROUP.id'),
                         nullable=False)
    group = db.relationship('Group')
    create_time = db.Column(db.DateTime, default=datetime.now)
    enabled = db.Column(db.Boolean, default=False)

    def __unicode__(self):
        return self.name


class Group(db.Model):

    __tablename__ = 'TB_GROUP'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(16), unique=True)
    default_url = db.Column(db.String(256))

    def __unicode__(self):
        return _(self.name)

    def __repr__(self):
        return '<Group: %s>' % self.name
