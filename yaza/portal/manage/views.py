#-*- coding:utf-8 -*-
import os
import zipfile
from flask import render_template, request
from flask.ext.databrowser import ModelView, sa, col_spec
from flask.ext.babel import lazy_gettext, _

from . import manage
from flask.ext.databrowser.extra_widgets import Image
from yaza import ext_validators
from yaza.apis.ocspu import OCSPUWrapper, AspectWrapper
from yaza.basemain import app
from yaza.models import SPU, OCSPU, Aspect, DesignRegion
from yaza.database import db
from yaza.utils import assert_dir, do_commit

ARCHIVES = tuple('zip'.split())

zip_validator = ext_validators.FileUploadValidator(".*\.zip", message=_("upload Zip files"))


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1] in ARCHIVES


def garble_filename(source):
    from hashlib import md5
    from time import time

    return md5(request.remote_addr + source + str(time())).hexdigest() + ".jpg"


def unzip(source_filename, dest_dir):
    all_files = []
    with zipfile.ZipFile(source_filename) as zf:
        zf.extractall(dest_dir)
        _files = zf.namelist()

    #由于上传的zip内可能存在与现有文件相同的名字，所以重命名
    for _f in _files:
        if os.path.exists(os.path.join(dest_dir, _f)):
            if _f != app.config["ASPECT_FILE_NAME"]:
                garbled_name = garble_filename(_f)
                os.rename(os.path.join(dest_dir, _f), os.path.join(dest_dir, garbled_name))
                all_files.append(garbled_name)
            else:
                all_files.append(_f)
    return all_files


def _delete_file(dir_, filename):
    file_ = os.path.join(dir_, filename)
    if os.path.exists(file_):
        os.unlink(file_)


@manage.route("/")
def index():
    return render_template("manage/index.html")


class SPUModelView(ModelView):
    def try_view(self, *args):
        pass

    def try_create(self):
        pass


class OCSPUModelView(ModelView):
    create_template = edit_template = 'ocspu/ocspu-form.html'

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

        return ["spu", "color", col_spec.FileColSpec('pic_zip', label=_('upload zip'), max_num=4, save_path=save_path,
                                                     validators=[zip_validator])]

    @ModelView.cached
    @property
    def list_columns(self):
        return ["id", "spu", "color",
                col_spec.HtmlSnippetColSpec('aspect_list', "ocspu/aspects-snippet.html")]

    def expand_model(self, obj):
        return OCSPUWrapper(obj)

    @ModelView.cached
    @property
    def edit_columns(self):
        return ["spu", "color", col_spec.HtmlSnippetColSpec('aspect_list', "ocspu/aspects.html"),
                col_spec.FileColSpec('pic_zip', label=_('upload zip'), validators=[zip_validator])]

    def rename_aspect_file(self, aspect_file_name_, dir_):
        new_aspect_file_name = garble_filename(aspect_file_name_)
        os.rename(os.path.join(dir_, aspect_file_name_), os.path.join(dir_, new_aspect_file_name))
        return new_aspect_file_name

    def get_base_pic_folder(self, obj):
        return os.path.join(app.config["UPLOAD_FOLDER"], "ocspu", str(obj.spu.id), str(obj.id))

    def save_pic(self, obj):
        file_list = obj.pic_zip if isinstance(obj.pic_zip, list) else [obj.pic_zip]
        for file_ in file_list:
            dir_ = self.get_base_pic_folder(obj)
            assert_dir(dir_)
            files = unzip(file_, dir_)

            aspect_file_name_ = app.config["ASPECT_FILE_NAME"]
            if os.path.exists(os.path.join(dir_, aspect_file_name_)):
                new_aspect_file_name = self.rename_aspect_file(aspect_file_name_, dir_)
                aspect = Aspect(ocspu=obj, pic_path=new_aspect_file_name)
                do_commit(aspect)
                for filename in files:
                    if filename != aspect_file_name_:
                        do_commit(DesignRegion(aspect=aspect, pic_path=filename))

            os.unlink(file_)

    def on_record_created(self, obj):
        if hasattr(obj, "pic_zip") and obj.pic_zip:
            self.save_pic(obj)

    def _delete_old_aspects_and_pics(self, model):
        id_list_ = [int(id_) for id_ in request.form.getlist("aspect_id_list")]
        base_pic_folder = self.get_base_pic_folder(model)
        for aspect in model.aspect_list:
            if aspect.id not in id_list_:
                for design_region in aspect.design_region_list:
                    do_commit(design_region, "delete")
                    _delete_file(base_pic_folder, design_region.pic_path)
                do_commit(aspect, "delete")
                _delete_file(base_pic_folder, aspect.pic_path)

    def on_model_change(self, form, model):
        self._delete_old_aspects_and_pics(model)

        if hasattr(model, "pic_zip") and model.pic_zip:
            self.save_pic(model)

    def try_edit(self, preprocessed_objs=None):
        pass


class AspectModelView(ModelView):
    create_template = edit_template = 'ocspu/aspect-form.html'

    def try_view(self, processed_objs=None):
        pass

    def try_edit(self, processed_objs=None):
        pass

    @ModelView.cached
    @property
    def edit_columns(self):
        return [col_spec.ColSpec("pic_url", widget=Image(Image.NORMAL)),
                col_spec.HtmlSnippetColSpec('design_region_list', "ocspu/design-regions.html"),
                col_spec.FileColSpec('pic_zip', label=_('upload zip'), validators=[zip_validator])]

    def expand_model(self, obj):
        return AspectWrapper(obj)

    def get_base_pic_folder(self, obj):
        return os.path.join(app.config["UPLOAD_FOLDER"], "ocspu", str(obj.ocspu.spu.id), str(obj.ocspu.id))

    def _delete_old_design_regions(self, model):
        id_list_ = [int(id_) for id_ in request.form.getlist("design_region_id_list")]
        base_pic_folder = self.get_base_pic_folder(model)
        for design_region in model.design_region_list:
            if design_region.id not in id_list_:
                do_commit(design_region, "delete")
                _delete_file(base_pic_folder, design_region.pic_path)

    def on_model_change(self, form, model):
        self._delete_old_design_regions(model)

        if hasattr(model, "pic_zip") and model.pic_zip:
            os.unlink(os.path.join(self.get_base_pic_folder(model), model.pic_path))
            self.save_pic(model)

    #TODO this is a fake
    def rename_aspect_file(self, aspect_file_name_, dir_):
        def fake_name():
            from hashlib import md5
            from time import time

            return md5(request.remote_addr + str(time())).hexdigest() + ".jpg"

        new_aspect_file_name = fake_name()
        os.rename(os.path.join(dir_, aspect_file_name_), os.path.join(dir_, new_aspect_file_name))
        return new_aspect_file_name

    def save_pic(self, obj):
        file_list = obj.pic_zip if isinstance(obj.pic_zip, list) else [obj.pic_zip]
        for file_ in file_list:
            dir_ = self.get_base_pic_folder(obj)
            assert_dir(dir_)
            files = unzip(file_, dir_)

            aspect_file_name_ = app.config["ASPECT_FILE_NAME"]
            if os.path.exists(os.path.join(dir_, aspect_file_name_)):
                new_aspect_file_name = self.rename_aspect_file(aspect_file_name_, dir_)
                obj.pic_path = new_aspect_file_name
                do_commit(obj)

                for filename in files:
                    if filename != aspect_file_name_:
                        do_commit(DesignRegion(aspect=obj, pic_path=filename))
            os.unlink(file_)


spu_model_view = SPUModelView(sa.SAModell(SPU, db, lazy_gettext("SPU")))

ocspu_model_view = OCSPUModelView(sa.SAModell(OCSPU, db, lazy_gettext("OCSPU")))

aspect_model_view = AspectModelView(sa.SAModell(Aspect, db, lazy_gettext("Aspect")))