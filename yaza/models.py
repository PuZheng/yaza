# -*- coding: UTF-8 -*-
from datetime import datetime

from flask.ext.babel import _

from .database import db

tag_and_design_image = db.Table("TB_TAG_AND_DESIGN_IMAGE",
                                db.Column("tag_id", db.Integer,
                                          db.ForeignKey(
                                              'TB_TAG.id')),
                                db.Column("design_image_id", db.Integer,
                                          db.ForeignKey("TB_DESIGN_IMAGE.id")))


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
    name = db.Column(db.String(16))
    shape = db.Column(db.String(16))
    brief = db.Column(db.String(64))

    def __unicode__(self):
        return _(self.name)

    def __repr__(self):
        return "<SPU: %s>" % self.shape


class OCSPU(db.Model):
    __tablename__ = "TB_OCSPU"
    id = db.Column(db.Integer, primary_key=True)
    color = db.Column(db.String(16))
    cover_path = db.Column(db.String(64))
    spu_id = db.Column(db.Integer, db.ForeignKey("TB_SPU.id"), nullable=False)
    spu = db.relationship("SPU", backref='ocspu_list')
    rgb = db.Column(db.String(7)) # #rrggbb


class Aspect(db.Model):
    __tablename__ = "TB_ASPECT"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(16))
    ocspu_id = db.Column(db.Integer, db.ForeignKey("TB_OCSPU.id"),
                         nullable=False)
    ocspu = db.relationship("OCSPU",
                            backref=db.backref("aspect_list",
                                               cascade="all, delete-orphan"))
    pic_path = db.Column(db.String(64))
    thumbnail_path = db.Column(db.String(64))
    width = db.Column(db.Integer, doc=u"图片宽度，单位px", default=0)
    height = db.Column(db.Integer, doc=u"图片高度，单位px", default=0)


class DesignRegion(db.Model):
    __tablename__ = "TB_DESIGN_REGION"
    id = db.Column(db.Integer, primary_key=True)
    aspect_id = db.Column(db.Integer, db.ForeignKey("TB_ASPECT.id"), nullable=False)
    aspect = db.relationship("Aspect", backref=db.backref("design_region_list", cascade="all, delete-orphan"))
    name = db.Column(db.String(16))
    pic_path = db.Column(db.String(64))
    width = db.Column(db.Float, doc=u'以英寸为单位')
    height = db.Column(db.Float, doc=u'以英寸为单位')
    edge_file = db.Column(db.String(64))
    control_point_file = db.Column(db.String(64))


class SKU(db.Model):
    __tablename__ = "TB_SKU"
    id = db.Column(db.Integer, primary_key=True)
    skc_id = db.Column(db.Integer, db.ForeignKey("TB_SKC.id"), nullable=False)


class SKC(db.Model):
    __tablename__ = "TB_SKC"
    id = db.Column(db.Integer, primary_key=True)
    ocspu_id = db.Column(db.Integer, db.ForeignKey("TB_OCSPU.id"), nullable=False)
    size = db.Column(db.Integer)


class DesignImage(db.Model):
    __tablename__ = "TB_DESIGN_IMAGE"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(32), nullable=False)
    pic_url = db.Column(db.String(64))
    tags = db.relationship("Tag",
                           secondary=tag_and_design_image,
                           backref="design_image_list")


class Permission(db.Model):
    __tablename__ = "TB_PERMISSION"
    name = db.Column(db.String(64), primary_key=True)

    def __unicode__(self):
        return self.name

    def __repr__(self):
        return "<Permission: %s>" % self.name.encode("utf-8")

permission_and_group_table = db.Table("TB_PERMISSION_AND_GROUP",
                                      db.Column("permission_name",
                                                db.String(64),
                                                db.ForeignKey(
                                                    'TB_PERMISSION.name')),
                                      db.Column("group_id", db.Integer,
                                                db.ForeignKey("TB_GROUP.id")))


class Tag(db.Model):
    __tablename__ = "TB_TAG"

    id = db.Column(db.Integer, primary_key=True)
    tag = db.Column(db.String(16), nullable=False, unique=True)


class DesignResult(db.Model):

    __tablename__ = "TB_DESIGN_RESULT"
    id = db.Column(db.Integer, primary_key=True)
    create_time = db.Column(db.DateTime, default=datetime.now)
    user_id = db.Column(db.Integer, db.ForeignKey("TB_USER.id"), nullable=False)
    user = db.relationship("User")
    order_id = db.Column(db.String(16))
    file_path = db.Column(db.String(64))
