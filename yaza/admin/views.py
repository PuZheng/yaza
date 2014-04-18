#-*- coding:utf-8 -*-
import os
import zipfile
from flask import request
from flask.ext.databrowser import ModelView, sa, col_spec
from flask.ext.babel import lazy_gettext, _

from flask.ext.databrowser.extra_widgets import Image
import shutil
from yaza import ext_validators
from yaza.apis.ocspu import OCSPUWrapper, AspectWrapper
from yaza.basemain import app
from yaza.models import SPU, OCSPU, Aspect, DesignRegion
from yaza.database import db
from yaza.utils import assert_dir, do_commit

ARCHIVES = ('zip', )

IMAGES = ('jpg', "jpeg")


def allowed_file(filename, types=ARCHIVES):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in types


zip_validator = ext_validators.FileUploadValidator(allowed_file, message=_("Please Upload Zip files"))


def garble_filename(source):
    from hashlib import md5
    from time import time

    return md5(request.remote_addr + source + str(time())).hexdigest() + ".jpg"


def unzip(source_filename, dest_dir):
    with zipfile.ZipFile(source_filename) as zf:
        zf.extractall(dest_dir)


def _delete_file(dir_, filename):
    file_ = os.path.join(dir_, filename)
    if os.path.exists(file_):
        os.unlink(file_)


class SPUModelView(ModelView):
    def try_view(self, *args):
        pass

    def try_create(self):
        pass


class OCSPUModelView(ModelView):
    create_template = edit_template = 'admin/ocspu/ocspu-form.html'

    def try_view(self, *args):
        pass

    def try_create(self):
        pass

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
        return ["id", "spu", "color",
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

        for root_dir in os.listdir(dir_):
            files = []
            dirs = []
            for name in os.listdir(os.path.join(dir_, root_dir)):
                file_path = os.path.join(root_dir, name)
                if os.path.isfile(os.path.join(dir_, file_path)):
                    files.append(file_path)
                else:
                    dirs.append(file_path)
            if len(files) >= 1:
                pic_path = files[0]
                if allowed_file(pic_path, IMAGES):
                    aspect = Aspect(ocspu=obj, pic_path=pic_path)
                    for dir_path in dirs:
                        for root, walk_dirs, design_files in os.walk(os.path.join(dir_, dir_path)):
                            for design_file in design_files:
                                if allowed_file(design_file, IMAGES):
                                    pic_path = os.path.join(dir_path, design_file)
                                    do_commit(DesignRegion(aspect=aspect, pic_path=pic_path))

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

    def try_edit(self, preprocessed_objs=None):
        pass


class AspectModelView(ModelView):
    create_template = edit_template = 'admin/ocspu/aspect-form.html'

    def try_view(self, processed_objs=None):
        pass

    @ModelView.cached
    @property
    def edit_columns(self):
        return [col_spec.ColSpec("pic_url", widget=Image(Image.NORMAL)),
                col_spec.HtmlSnippetColSpec('design_region_list', "admin/ocspu/design-regions.html")]

    def expand_model(self, obj):
        return AspectWrapper(obj)

    def get_base_pic_folder(self, obj):
        return os.path.join(app.config["UPLOAD_FOLDER"], "ocspu", str(obj.ocspu.spu.id), str(obj.ocspu.id))


spu_model_view = SPUModelView(sa.SAModell(SPU, db, lazy_gettext("SPU")))

ocspu_model_view = OCSPUModelView(sa.SAModell(OCSPU, db, lazy_gettext("OCSPU")))

aspect_model_view = AspectModelView(sa.SAModell(Aspect, db, lazy_gettext("Aspect")))