#-*- coding:utf-8 -*-
import os
import shutil

from flask.ext.babel import lazy_gettext, _
from flask.ext.databrowser import ModelView
from flask.ext.databrowser.col_spec import InputColSpec, FileColSpec, ColSpec
from flask.ext.databrowser.extra_widgets import Image
from flask.ext.databrowser.sa import SAModell

from yaza import models
from yaza.apis.ocspu import DesignImageWrapper
from yaza.database import db
from yaza.utils import assert_dir
from yaza import ext_validators


IMAGES = ('jpg', "jpeg", "png")

CONTROL_POINTS_NUMBER = (4, 4)


def allowed_file(filename, types=IMAGES):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in types


img_validator = ext_validators.FileUploadValidator(allowed_file, message=_("Please Upload Picture"), nullable=False)


class OCSPUModelView(ModelView):
    def try_edit(self, processed_objs=None):
        return True

    def try_view(self, processed_objs=None):
        return True


class DesignImageModelView(ModelView):
    create_template = edit_template = "ocspu/form.html"

    def try_edit(self, processed_objs=None):
        return True

    def try_view(self, processed_objs=None):
        return True

    def try_create(self):
        return True

    @ModelView.cached
    @property
    def create_columns(self):
        return [InputColSpec("title", label=u"标题"),
                FileColSpec("pic_path", label=u"上传设计图", validators=[img_validator])]

    def on_record_created(self, obj):
        obj.pic_path = self.save_pic(obj.pic_path)

    def expand_model(self, obj):
        return DesignImageWrapper(obj)

    def on_model_change(self, form, model):
        model.pic_path = self.save_pic(model.pic_path)

    @ModelView.cached
    @property
    def list_columns(self):
        return ["id", "title", ColSpec('pic_url', label=_(u'设计图'), widget=Image(Image.SMALL))]

    def save_pic(self, pic_path):
        from hashlib import md5
        file_name = md5(pic_path).hexdigest() + os.path.splitext(pic_path)[-1]
        assert_dir(DesignImageWrapper.StoredDir)
        shutil.copy(pic_path, os.path.join(DesignImageWrapper.StoredDir, file_name))
        os.unlink(pic_path)
        return file_name

    @ModelView.cached
    @property
    def edit_columns(self):
        return [InputColSpec("title", label=u"标题"), ColSpec('pic_url', label=_(u'设计图'), widget=Image()),
                FileColSpec("pic_path", label=u"上传设计图", validators=[img_validator])]


ocspu_model_view = OCSPUModelView(modell=SAModell(models.OCSPU, db, lazy_gettext("OCSPU")))
design_image_view = DesignImageModelView(modell=SAModell(models.DesignImage, db, lazy_gettext("Design Image")))