# -*- coding:utf-8 -*-
import os
import shutil
from flask import render_template

from flask.ext.databrowser import ModelView, sa, col_spec, filters
from flask.ext.babel import lazy_gettext, _
from flask.ext.databrowser.extra_widgets import Image
from flask.ext.principal import Permission, RoleNeed, PermissionDenied

from yaza import ext_validators, const
from yaza.apis import wraps
from yaza.apis.ocspu import OCSPUWrapper, AspectWrapper
from yaza.basemain import app
from yaza.models import SPU, OCSPU, Aspect, DesignRegion, DesignResult
from yaza.database import db
from yaza.utils import assert_dir, do_commit
from yaza.tools.utils import allowed_file, unzip, extract_images, create_or_update_spu


CONTROL_POINTS_NUMBER = (4, 4)

zip_validator = ext_validators.FileUploadValidator(allowed_file, message=_("Please Upload Zip files"))


class SPUAdminModelView(ModelView):
    edit_template = "admin/spu/spu.html"

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
        return render_template(self.edit_template, spu=spu)


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
    @ModelView.cached
    @property
    def list_columns(self):
        return [col_spec.ColSpec("id", u"编号"), col_spec.ColSpec("user", u"设计者"),
                col_spec.ColSpec("order_id", label=u"订单号"),
                col_spec.ColSpec('create_time', u"创建时间",
                                 formatter=lambda v, obj:
                                 v.strftime('%Y-%m-%d %H:%M'))]

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
                col_spec.HtmlSnippetColSpec("file_path",
                                            template="admin/spu/resign-result-download-snippet.html")]

    def expand_model(self, obj):
        return wraps(obj)


spu_model_view = SPUAdminModelView(sa.SAModell(SPU, db, lazy_gettext("SPU")))

ocspu_model_view = OCSPUAdminModelView(sa.SAModell(OCSPU, db, lazy_gettext("OCSPU")))

aspect_model_view = AspectAdminModelView(sa.SAModell(Aspect, db, lazy_gettext("Aspect")))

design_result_view = DesignResultModelView(modell=sa.SAModell(DesignResult, db, lazy_gettext("Design Result")))
