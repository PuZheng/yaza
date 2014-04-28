#-*- coding:utf-8 -*-
import os

from flask import url_for, json
from werkzeug.utils import cached_property

from yaza.apis import ModelWrapper
from yaza.basemain import app


class OCSPUWrapper(ModelWrapper):
    @property
    def cover(self):
        aspect_list = [aspect for aspect in self.aspect_list if
                       aspect.name == self.spu.cover_name]
        if aspect_list:
            return aspect_list[0]
        return None

    def as_dict(self, camel_case):
        return {
            'id': self.id,
            'aspectList' if camel_case else 'aspect_list':
                [aspect.as_dict(camel_case) for aspect in self.aspect_list],
            'cover': self.cover.as_dict(camel_case) if self.cover else ""
        }


class AspectWrapper(ModelWrapper):
    @property
    def pic_url(self):
        if self.pic_path:
            if os.path.exists(os.path.join(app.config["UPLOAD_FOLDER"], self.pic_path)):
                return url_for("image.serve", filename=self.pic_path)

        return ""

    def as_dict(self, camel_case=True):
        return {
            'id': self.id,
            'picUrl' if camel_case else 'pic_url': self.pic_url,
            'designRegionList' if camel_case else 'design_region_list':
                [dr.as_dict(camel_case) for dr in self.design_region_list]
        }

    @property
    def spu(self):
        return self.ocspu.spu


class DesignRegionWrapper(ModelWrapper):
    DETECT_EDGE_EXTENSION = "edge"

    CONTROL_POINT_EXTENSION = "cpmap"

    @property
    def pic_url(self):
        if self.pic_path:
            if os.path.exists(os.path.join(app.config["UPLOAD_FOLDER"], self.pic_path)):
                return url_for("image.serve", filename=self.pic_path)
        return ""

    @property
    def ocspu_dir(self):
        return os.path.join(app.config["UPLOAD_FOLDER"], "ocspu", str(self.spu.id), str(self.ocspu.id))

    @property
    def spu(self):
        return self.aspect.ocspu.spu

    @property
    def ocspu(self):
        return self.aspect.ocspu

    @property
    def serialized_edge_file(self):
        return os.path.join(self.ocspu_dir, self.pic_path).replace(os.path.splitext(self.pic_path)[-1],
                                                                   "." + DesignRegionWrapper.DETECT_EDGE_EXTENSION)

    @property
    def serialized_control_point_file(self):
        return os.path.join(self.ocspu_dir, self.pic_path).replace(os.path.splitext(self.pic_path)[-1],
                                                                   "." + DesignRegionWrapper.CONTROL_POINT_EXTENSION)

    def read_file(self, file_name):
        result = ""
        if os.path.exists(file_name):
            with open(file_name) as _file:
                for line in _file:
                    result += line
        return result

    @cached_property
    def edges(self):
        return json.loads(self.read_file(self.serialized_edge_file))

    @cached_property
    def control_points(self):
        return json.loads(self.read_file(self.serialized_control_point_file))

    def as_dict(self, camel_case):
        return {
            'id': self.id,
            'picUrl' if camel_case else 'pic_url': self.pic_url,
            'size': [1754, 2480],
        }


class DesignImageWrapper(ModelWrapper):
    @classmethod
    def _stored_dir(cls):
        return os.path.join(app.config["UPLOAD_FOLDER"], app.config["DESIGN_IMAGE_FOLDER"])

    @property
    def pic_url(self):
        if self.pic_path:
            return url_for("image.serve", filename=self.pic_path)
        return ""

    def as_dict(self, camel_case=True):
        return {
            "id": self.id,
            "title": self.title,
            'picUrl' if camel_case else 'pic_url': self.pic_url
        }


DesignImageWrapper.StoredDir = DesignImageWrapper._stored_dir()
