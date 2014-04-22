#-*- coding:utf-8 -*-
import os

from flask import url_for, json
from werkzeug.utils import cached_property

from yaza.apis import ModelWrapper
from yaza.basemain import app


class OCSPUWrapper(ModelWrapper):
    pass


class AspectWrapper(ModelWrapper):
    @property
    def pic_url(self):
        if self.pic_path:
            ocspu_dir = os.path.join(app.config["UPLOAD_FOLDER"], "ocspu", str(self.ocspu.spu.id), str(self.ocspu.id))

            if os.path.exists(os.path.join(ocspu_dir, self.pic_path)):
                return url_for("admin.pic_render", spu_id=self.ocspu.spu.id, ocspu_id=self.ocspu.id,
                               pic_path=self.pic_path)

        return ""

    @property
    def spu(self):
        return self.ocspu.spu


class DesignRegionWrapper(ModelWrapper):
    DETECT_EDGE_EXTENSION = "edge"

    CONTROL_POINT_EXTENSION = "cpmap"


    @property
    def pic_url(self):
        if self.pic_path:
            if os.path.exists(os.path.join(self.ocspu_dir, self.pic_path)):
                return url_for("admin.pic_render", spu_id=self.spu.id, ocspu_id=self.ocspu.id, pic_path=self.pic_path)

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