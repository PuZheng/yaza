#-*- coding:utf-8 -*-
import os
import shutil

from flask.ext.databrowser import ModelView, sa, col_spec
from flask.ext.babel import lazy_gettext, _
from flask.ext.databrowser.extra_widgets import Image
from flask.ext.principal import Permission, RoleNeed

from yaza import ext_validators, const
from yaza.apis.ocspu import OCSPUWrapper, AspectWrapper
from yaza.basemain import app
from yaza.models import SPU, OCSPU, Aspect, DesignRegion
from yaza.database import db
from yaza.utils import assert_dir, do_commit
from yaza.tools.utils import allowed_file, unzip, extract_images, create_or_update_spu


CONTROL_POINTS_NUMBER = (4, 4)

zip_validator = ext_validators.FileUploadValidator(allowed_file, message=_("Please Upload Zip files"))


class SPUAdminModelView(ModelView):
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


class OCSPUAdminModelView(ModelView):
    list_template = "admin/ocspu/ocspu-list.html"
    create_template = edit_template = 'admin/ocspu/ocspu-form.html'

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

        return ["spu", "color", col_spec.FileColSpec('pic_zip', label=_('upload zip'), save_path=save_path,
                                                     validators=[zip_validator])]

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
        return ["spu", "color", col_spec.HtmlSnippetColSpec('aspect_list', "admin/ocspu/aspects.html"),
                col_spec.FileColSpec('pic_zip', label=_('upload zip'), validators=[zip_validator])]

    def get_base_pic_folder(self, obj):
        return os.path.join(app.config["UPLOAD_FOLDER"], "ocspu", str(obj.spu.id), str(obj.id))

    def save_new_pics(self, obj):
        dir_ = self.get_base_pic_folder(obj)

        assert_dir(dir_)
        unzip(obj.pic_zip, dir_)

        images_dict = extract_images(dir_, app.config["UPLOAD_FOLDER"])

        for key, aspect_dict in images_dict.iteritems():
            aspect = Aspect(ocspu=obj, pic_path=aspect_dict["file_path"], part=aspect_dict.get("path", "other"))
            for part, design_region in aspect_dict.get("design_region_list", {}).iteritems():
                do_commit(DesignRegion(aspect=aspect, pic_path=design_region, part=part))
        os.unlink(obj.pic_zip)

    def clear_old_pics(self, obj):
        obj.aspect_list = []
        do_commit(obj)
        dir_ = self.get_base_pic_folder(obj)
        if os.path.exists(dir_):
            shutil.rmtree(dir_)

    def on_record_created(self, obj):
        if hasattr(obj, "pic_zip") and obj.pic_zip:
            self.clear_old_pics(obj)
            self.save_new_pics(obj)

    def on_model_change(self, form, model):
        if hasattr(model, "pic_zip") and model.pic_zip:
            self.clear_old_pics(model)
            self.save_new_pics(model)


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

    def get_base_pic_folder(self, obj):
        return os.path.join(app.config["UPLOAD_FOLDER"], "ocspu", str(obj.ocspu.spu.id), str(obj.ocspu.id))


spu_model_view = SPUAdminModelView(sa.SAModell(SPU, db, lazy_gettext("SPU")))

ocspu_model_view = OCSPUAdminModelView(sa.SAModell(OCSPU, db, lazy_gettext("OCSPU")))

aspect_model_view = AspectAdminModelView(sa.SAModell(Aspect, db, lazy_gettext("Aspect")))