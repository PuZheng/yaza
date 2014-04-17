# -*- coding: UTF-8 -*-
from datetime import datetime
import os
from path import path
from flask import url_for

from flask.ext.babel import _
import shutil
import sys
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


class SPU(db.Model):
    __tablename__ = 'TB_SPU'

    id = db.Column(db.Integer, primary_key=True)
    shape = db.Column(db.String(16))
    brief = db.Column(db.String(64))

    def __unicode__(self):
        return _(self.shape)

    def __repr__(self):
        return "<SPU: %s>" % self.shape


class OCSPU(db.Model):
    __tablename__ = "TB_OCSPU"
    id = db.Column(db.Integer, primary_key=True)
    color = db.Column(db.String(16))
    spu_id = db.Column(db.Integer, db.ForeignKey("TB_SPU.id"), nullable=False)
    spu = db.relationship("SPU")


class Aspect(db.Model):
    __tablename__ = "TB_ASPECT"
    id = db.Column(db.Integer, primary_key=True)
    ocspu_id = db.Column(db.Integer, db.ForeignKey("TB_OCSPU.id"), nullable=False)
    ocspu = db.relationship("OCSPU", backref="aspect_list")
    pic_path = db.Column(db.String(64), unique=True)


class DesignRegion(db.Model):
    __tablename__ = "TB_DESIGN_REGION"
    id = db.Column(db.Integer, primary_key=True)
    aspect_id = db.Column(db.Integer, db.ForeignKey("TB_ASPECT.id"), nullable=False)
    aspect = db.relationship("Aspect", backref=db.backref("design_region_list", cascade="all, delete-orphan"))
    pic_path = db.Column(db.String(64), unique=True)


class SKU(db.Model):
    __tablename__ = "TB_SKU"
    id = db.Column(db.Integer, primary_key=True)
    skc_id = db.Column(db.Integer, db.ForeignKey("TB_SKC.id"), nullable=False)


class SKC(db.Model):
    __tablename__ = "TB_SKC"
    id = db.Column(db.Integer, primary_key=True)
    ocspu_id = db.Column(db.Integer, db.ForeignKey("TB_OCSPU.id"), nullable=False)
    size = db.Column(db.Integer)