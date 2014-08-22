# -*- coding:utf-8 -*-
import base64
import os
import shutil
import time
from hashlib import md5

from flask import render_template, redirect, url_for
from flask.ext.databrowser import ModelView, sa, col_spec, filters, action
from flask.ext.babel import lazy_gettext, _
from flask.ext.databrowser.extra_widgets import Image
from flask.ext.principal import Permission, RoleNeed, PermissionDenied

from yaza import ext_validators, const
from yaza.apis import wraps
from yaza.apis.ocspu import OCSPUWrapper, AspectWrapper, DesignImageWrapper
from yaza.basemain import app, admin_nav_bar
from yaza.models import SPU, OCSPU, Aspect, DesignResult, DesignImage
from yaza.database import db
from yaza.tools.color_tools import dominant_colorz
from yaza.utils import assert_dir, do_commit
from yaza.tools.utils import allowed_file, unzip, create_or_update_spu
from yaza.qiniu_handler import upload_str


CONTROL_POINTS_NUMBER = (4, 4)
IMAGES = ('jpg', "jpeg", "png")

zip_validator = ext_validators.FileUploadValidator(allowed_file, message=_("Please Upload Zip files"))


def allowed_file(filename, types=IMAGES):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in types


img_validator = ext_validators.FileUploadValidator(allowed_file, message=_("Please Upload Picture"), nullable=False)


class _RedirectAction(action.RedirectAction):
    def test(self, *records):
        return 0 if records[0].published else -1

    def op_upon_list(self, objs, model_view):
        return redirect(url_for('admin.spu_url_generator', id_=objs[0].id))

    @property
    def forbidden_msg_formats(self):
        return {
            -1: u'请先发布该SPU！'
        }


class SPUAdminModelView(ModelView):
    def get_actions(self, processed_objs=None):
        return [_RedirectAction(u'生成用户链接')]

    def try_edit(self, processed_objs=None):
        Permission(RoleNeed(const.VENDOR_GROUP)).test()

    def try_view(self, processed_objs=None):
        Permission(RoleNeed(const.VENDOR_GROUP)).test()

    def try_create(self):
        Permission(RoleNeed(const.VENDOR_GROUP)).test()

    @ModelView.cached
    @property
    def create_columns(self):
        def save_path(obj, filename):
            from hashlib import md5

            return os.path.join(app.config["UPLOAD_FOLDER"], md5(filename).hexdigest() + ".zip")

        return [
            col_spec.FileColSpec('spu_zip', label=_('upload zip'), save_path=save_path, validators=[zip_validator])]

    @property
    def base_dir(self):
        return os.path.join(app.config["UPLOAD_FOLDER"], app.config["SPU_IMAGE_FOLDER"])

    def on_record_created(self, obj):
        upload_dir = os.path.join(app.config["UPLOAD_FOLDER"])

        spu_dir = os.path.join(self.base_dir, str(obj.id))
        assert_dir(spu_dir)
        unzip(obj.spu_zip, spu_dir)
        try:
            create_or_update_spu(spu_dir, upload_dir, obj)
        except Exception as e:
            do_commit(obj, "delete")
            raise e

        os.unlink(obj.spu_zip)

    def edit_view(self, id_):
        spu = self._get_one(id_)
        self.try_edit(spu)
        return render_template('admin/spu.html',
                               nav_bar=admin_nav_bar, time=time.time(),
                               model_view=self)


    def create_view(self):
        return render_template('admin/spu.html',
                               nav_bar=admin_nav_bar, time=time.time(),
                               model_view=self)

    @ModelView.cached
    @property
    def list_columns(self):
        return ["id", col_spec.ColSpec("name", label=u'名称'),
                col_spec.ColSpec("published", label=u'发布', formatter=lambda v, obj: u'是' if v else u'否')]


class OCSPUAdminModelView(ModelView):
    list_template = "admin/ocspu/ocspu-list.html"
    create_template = edit_template = 'admin/ocspu/ocspu-form.html'

    def try_edit(self, processed_objs=None):
        Permission(RoleNeed(const.VENDOR_GROUP)).test()

    def try_view(self, processed_objs=None):
        Permission(RoleNeed(const.VENDOR_GROUP)).test()

    def try_create(self):
        raise PermissionDenied

    @ModelView.cached
    @property
    def list_columns(self):
        return ["id", "spu", "color", col_spec.ColSpec("cover", widget=Image(Image.SMALL)),
                col_spec.HtmlSnippetColSpec('aspect_list', "admin/ocspu/aspects-snippet.html")]

    def expand_model(self, obj):
        return OCSPUWrapper(obj)

    @ModelView.cached
    @property
    def edit_columns(self):
        return ["spu", "color", col_spec.HtmlSnippetColSpec('aspect_list', "admin/ocspu/aspects.html")]


class AspectAdminModelView(ModelView):
    create_template = edit_template = 'admin/ocspu/aspect-form.html'

    def try_edit(self, processed_objs=None):
        Permission(RoleNeed(const.VENDOR_GROUP)).test()

    def try_view(self, processed_objs=None):
        Permission(RoleNeed(const.VENDOR_GROUP)).test()

    def try_create(self):
        Permission(RoleNeed(const.VENDOR_GROUP)).test()

    @ModelView.cached
    @property
    def edit_columns(self):
        return [col_spec.ColSpec("pic_url", widget=Image(Image.NORMAL)),
                col_spec.HtmlSnippetColSpec('design_region_list', "admin/ocspu/design-regions.html")]

    def expand_model(self, obj):
        return AspectWrapper(obj)


class DesignResultModelView(ModelView):

    list_template = "admin/design-result/list.html"


    @ModelView.cached
    @property
    def list_columns(self):
        return [col_spec.ColSpec("id", u"编号"), col_spec.ColSpec("user", u"设计者"),
                col_spec.ColSpec("order_id", label=u"订单号"),
                col_spec.ColSpec('create_time', u"创建时间",
                                 formatter=lambda v, obj:
                                 v.strftime('%Y-%m-%d %H:%M')),
                col_spec.HtmlSnippetColSpec("files", template="admin/spu/design-result-file-list.html")]

    def try_view(self, processed_objs=None):
        pass

    @property
    def filters(self):
        return [filters.Contains("order_id", self, name=u"包含", label=u"订单号"),
                filters.EqualTo("user", self, name=u"是", label=u"设计者"),
                filters.Between("create_time", self, name=u"与", label=u"创建时间")]

    @ModelView.cached
    @property
    def edit_columns(self):
        return [col_spec.ColSpec("id", u"编号"), col_spec.ColSpec("user", u"设计者"), col_spec.ColSpec(
            'create_time', u"创建时间", formatter=lambda v, obj: v.strftime('%Y-%m-%d %H:%M')),
                col_spec.HtmlSnippetColSpec("files",
                                            template="admin/spu/resign-result-download-snippet.html")]

    def expand_model(self, obj):
        return wraps(obj)


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
        return [col_spec.InputColSpec("title", label=u"标题"),
                col_spec.FileColSpec("pic_upload", label=u"上传设计图", validators=[img_validator])]

    def on_record_created(self, obj):
        obj.dominant_color = dominant_colorz(obj.pic_upload, 1)[0]
        obj.pic_url = self.save_pic(obj.pic_upload)
        do_commit(obj)

    def expand_model(self, obj):
        return wraps(obj)

    def on_model_change(self, form, model):
        if hasattr(model, "pic_upload"):
            model.dominant_color = dominant_colorz(model.pic_upload, 1)[0]
            model.pic_url = self.save_pic(model.pic_upload)

    @ModelView.cached
    @property
    def list_columns(self):
        return ["id", "title", col_spec.ColSpec('pic_url', label=_(u'设计图'), widget=Image(Image.SMALL))]

    def save_pic(self, pic_path):
        if app.config["QINIU_ENABLED"]:
            # key = md5sum(pic_path)
            key = os.path.splitext(pic_path)[0]
            data = open(pic_path, "rb").read()
            qiniu_url = upload_str(key + os.path.splitext(pic_path)[-1], data,
                                   app.config["QINIU_CONF"]["SPU_IMAGE_BUCKET"], True, "image/png")

            qiniu_duri = upload_str(key + ".duri", "data:image/png;base64," + base64.b64encode(data),
                                    app.config["QINIU_CONF"]["SPU_IMAGE_BUCKET"],
                                    True, "text/plain")
            return qiniu_url

        else:
            file_name = os.path.join(DesignImageWrapper.StoredDir,
                                     md5(pic_path).hexdigest() + os.path.splitext(pic_path)[-1])
            assert_dir(DesignImageWrapper.StoredDir)
            shutil.copy(pic_path, file_name)
            os.unlink(pic_path)
            return os.path.relpath(file_name, app.config["UPLOAD_FOLDER"])

    @ModelView.cached
    @property
    def edit_columns(self):
        return [col_spec.InputColSpec("title", label=u"标题"),
                col_spec.ColSpec('pic_url', label=_(u'设计图'), widget=Image()),
                col_spec.FileColSpec("pic_path", label=u"上传设计图")]


spu_model_view = SPUAdminModelView(sa.SAModell(SPU, db, lazy_gettext("SPU")))

ocspu_model_view = OCSPUAdminModelView(sa.SAModell(OCSPU, db, lazy_gettext("OCSPU")))

aspect_model_view = AspectAdminModelView(sa.SAModell(Aspect, db, lazy_gettext("Aspect")))

design_result_view = DesignResultModelView(modell=sa.SAModell(DesignResult, db, lazy_gettext("Design Result")))

design_image_view = DesignImageModelView(modell=sa.SAModell(DesignImage, db, lazy_gettext("Design Image")))
