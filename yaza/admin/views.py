#-*- coding:utf-8 -*-
import os
import zipfile
import shutil

from flask import json
from PIL import Image as PILImage
from flask.ext.databrowser import ModelView, sa, col_spec
from flask.ext.babel import lazy_gettext, _
from flask.ext.databrowser.extra_widgets import Image

from yaza import ext_validators
from yaza.apis.ocspu import OCSPUWrapper, AspectWrapper, DesignRegionWrapper
from yaza.basemain import app
from yaza.exceptions import BadImageFileException
from yaza.models import SPU, OCSPU, Aspect, DesignRegion
from yaza.database import db
from yaza.utils import assert_dir, do_commit
from yaza.tools.utils import detect_edges, calc_control_points


ARCHIVES = ('zip', )

IMAGES = ('jpg', "jpeg", "png")

CONTROL_POINTS_NUMBER = (4, 4)

def allowed_file(filename, types=ARCHIVES):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in types


zip_validator = ext_validators.FileUploadValidator(allowed_file, message=_("Please Upload Zip files"))


def unzip(source_filename, dest_dir):
    with zipfile.ZipFile(source_filename) as zf:
        zf.extractall(dest_dir)


def _delete_file(dir_, filename):
    file_ = os.path.join(dir_, filename)
    if os.path.exists(file_):
        os.unlink(file_)


def serialize(data, filename, encode_func=None):
    if encode_func:
        data = encode_func(data)
    if not isinstance(data, basestring):
        data = json.dumps(data)
    with open(filename, "w") as _file:
        _file.write(data)


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
                design_files = {}
                for dir_path in dirs:
                    for root, walk_dirs, files in os.walk(os.path.join(dir_, dir_path)):
                        for design_file in files:
                            if allowed_file(design_file, IMAGES):
                                filtered_files = design_files.setdefault(dir_path, [])
                                filtered_files.append(design_file)

                if allowed_file(pic_path, IMAGES):
                    # 先处理图片，之后再导入到数据库
                    for dir_path, files in design_files.iteritems():
                        for file_ in files:
                            image_filename = os.path.join(self.get_base_pic_folder(obj), dir_path, file_)

                            im = PILImage.open(image_filename)
                            try:
                                edges = detect_edges(im)
                            except Exception as e:
                                app.logger.error(e)
                                raise BadImageFileException(file_)
                            img_extension = os.path.splitext(file_)[-1]
                            edge_filename = image_filename.replace(img_extension,
                                                                   "." + DesignRegionWrapper.DETECT_EDGE_EXTENSION)
                            serialize(edges, edge_filename)
                            control_point_filename = image_filename.replace(img_extension,
                                                                            "." + DesignRegionWrapper.CONTROL_POINT_EXTENSION)
                            control_points = calc_control_points(edges, im.size, CONTROL_POINTS_NUMBER)
                            serialize(control_points, control_point_filename,
                                      lambda data: json.dumps(
                                          {key: [[list(k), list(v)]] for key, dict_ in data.iteritems() for
                                           k, v in dict_.iteritems()}))

                    aspect = Aspect(ocspu=obj, pic_path=pic_path)
                    for dir_path, files in design_files.iteritems():
                        for file_ in files:
                            pic_path = os.path.join(dir_path, file_)
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