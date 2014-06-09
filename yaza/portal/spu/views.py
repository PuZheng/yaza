# -*- coding:utf-8 -*-
import os
import shutil
import time

from flask import render_template, json, request
from flask.ext.databrowser import ModelView
from flask.ext.databrowser.col_spec import InputColSpec, FileColSpec, ColSpec
from flask.ext.databrowser.extra_widgets import Image
from flask.ext.databrowser.sa import SAModell
from flask.ext.babel import _, lazy_gettext
from flask.ext.principal import Permission, RoleNeed

from yaza import models, ext_validators, const
from yaza.basemain import app
from yaza.apis import wraps
from yaza.apis.ocspu import DesignImageWrapper
from yaza.database import db
from yaza.admin import serializer
from yaza.utils import assert_dir


IMAGES = ('jpg', "jpeg", "png")

CONTROL_POINTS_NUMBER = (4, 4)


def allowed_file(filename, types=IMAGES):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in types


img_validator = ext_validators.FileUploadValidator(allowed_file, message=_("Please Upload Picture"), nullable=False)


class SPUModelView(ModelView):
    edit_template = "spu/spu.html"

    def edit_view(self, id_):
        spu = self._get_one(id_)
        design_image_list = [wraps(di).as_dict(False) for di in models.DesignImage.query.all()]
        params = {"time": time.time(), "spu": wraps(spu), "design_image_list": json.dumps(design_image_list)}
        if "captcha" in request.args:
            params["order_id"], params["operator_id"] = serializer.loads(request.args["captcha"])

        return render_template(self.edit_template, **params)


class OCSPUModelView(ModelView):
    def try_edit(self, processed_objs=None):
        return True

    def try_view(self, processed_objs=None):
        return True


class DesignImageModelView(ModelView):
    create_template = edit_template = "spu/design-image.html"

    def try_edit(self, processed_objs=None):
        Permission(RoleNeed(const.VENDOR_GROUP)).test()

    def try_view(self, processed_objs=None):
        Permission(RoleNeed(const.VENDOR_GROUP)).test()

    def try_create(self):
        Permission(RoleNeed(const.VENDOR_GROUP)).test()

    @ModelView.cached
    @property
    def create_columns(self):
        return [InputColSpec("title", label=u"标题"),
                FileColSpec("pic_upload", label=u"上传设计图", validators=[img_validator])]

    def on_record_created(self, obj):
        obj.pic_path = self.save_pic(obj.pic_upload)
        from yaza.utils import do_commit

        do_commit(obj)

    def expand_model(self, obj):
        return wraps(obj)

    def on_model_change(self, form, model):
        if hasattr(model, "pic_upload"):
            model.pic_path = self.save_pic(model.pic_upload)

    @ModelView.cached
    @property
    def list_columns(self):
        return ["id", "title", ColSpec('pic_url', label=_(u'设计图'), widget=Image(Image.SMALL))]

    def save_pic(self, pic_path):
        from hashlib import md5

        file_name = os.path.join(DesignImageWrapper.StoredDir,
                                 md5(pic_path).hexdigest() + os.path.splitext(pic_path)[-1])
        assert_dir(DesignImageWrapper.StoredDir)
        shutil.copy(pic_path, file_name)
        os.unlink(pic_path)
        return os.path.relpath(file_name, app.config["UPLOAD_FOLDER"])

    @ModelView.cached
    @property
    def edit_columns(self):
        return [InputColSpec("title", label=u"标题"), ColSpec('pic_url', label=_(u'设计图'), widget=Image()),
                FileColSpec("pic_path", label=u"上传设计图")]


spu_model_view = SPUModelView(modell=SAModell(db=db, model=models.SPU, label=lazy_gettext(u"spu")))
ocspu_model_view = OCSPUModelView(modell=SAModell(models.OCSPU, db, lazy_gettext("OCSPU")))
design_image_view = DesignImageModelView(modell=SAModell(models.DesignImage, db, lazy_gettext("Design Image")))