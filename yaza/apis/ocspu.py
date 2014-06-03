#-*- coding:utf-8 -*-
import os

from flask import url_for, json
from werkzeug.utils import cached_property

from yaza.apis import ModelWrapper
from yaza.basemain import app
from yaza.upyun_handler import parse_image


class OCSPUWrapper(ModelWrapper):
    @property
    def cover(self):
        if self.cover_path:
            return parse_image(self.cover_path) if app.config.get(
                "UPYUN_ENABLE") else url_for("image.serve", filename=self.cover_path)
        return ""

    def as_dict(self, camel_case):
        return {
            'id': self.id,
            'aspectList' if camel_case else 'aspect_list':
                [aspect.as_dict(camel_case) for aspect in self.aspect_list],
            'cover': self.cover,
            'color': self.color,
        }


class AspectWrapper(ModelWrapper):
    @cached_property
    def pic_rel_path(self):
        return os.path.join(app.config["UPLOAD_FOLDER"], self.pic_path)

    @property
    def pic_url(self):
        if self.pic_path:
            return parse_image(self.pic_path + app.config["UPYUN_MD_PIC_SUFFIX"]) if app.config.get(
                "UPYUN_ENABLE") else url_for("image.serve", filename=self.pic_path)
        return ""

    @property
    def hd_pic_url(self):
        if self.pic_path:
            return parse_image(self.pic_path) if app.config.get(
                "UPYUN_ENABLE") else url_for("image.serve", filename=self.pic_path)
        return ""

    @property
    def thumbnail(self):
        if app.config.get("UPYUN_ENABLE"):
            #可能中途切换过UPYUN_ENABLE开关，所有需要额外判断
            thumbnail_suffix = app.config.get("UPYUN_THUMBNAIL_SUFFIX") or "!sm"
            if self.thumbnail_path and self.thumbnail_path.endswith(thumbnail_suffix):
                return parse_image(self.thumbnail_path)
            elif self.pic_path:
                return parse_image(self.pic_path + thumbnail_suffix)
        else:
            if self.thumbnail_path:
                return url_for("image.serve", filename=self.thumbnail_path)
        return ""

    def as_dict(self, camel_case=True):
        return {
            'id': self.id,
            'picUrl' if camel_case else 'pic_url': self.pic_url,
            'hdPicUrl' if camel_case else 'hd_pic_url': self.hd_pic_url,
            'thumbnail': self.thumbnail,
            'designRegionList' if camel_case else 'design_region_list':
                [dr.as_dict(camel_case) for dr in self.design_region_list],
            'name': self.name,
            'size': self.size,
        }

    @cached_property
    def size(self):
        if self.pic_path and os.path.exists(self.pic_rel_path):
            from PIL import Image

            im = Image.open(self.pic_rel_path)
            return im.size

        return 0, 0

    @property
    def spu(self):
        return self.ocspu.spu


class DesignRegionWrapper(ModelWrapper):
    DETECT_EDGE_EXTENSION = "edge"

    CONTROL_POINT_EXTENSION = "cpmap"

    @property
    def pic_url(self):
        if self.pic_path:
            return parse_image(self.pic_path) if app.config.get(
                "UPYUN_ENABLE") else url_for("image.serve", filename=self.pic_path)
        return ""


    @property
    def spu(self):
        return self.aspect.ocspu.spu

    @property
    def ocspu(self):
        return self.aspect.ocspu

    @property
    def serialized_edge_file(self):
        return self.pic_rel_path.replace(
            os.path.splitext(self.pic_path)[-1], "." + DesignRegionWrapper.DETECT_EDGE_EXTENSION)

    @property
    def serialized_control_point_file(self):
        return self.pic_rel_path.replace(
            os.path.splitext(self.pic_path)[-1], "." + DesignRegionWrapper.CONTROL_POINT_EXTENSION)

    @cached_property
    def pic_rel_path(self):
        return os.path.join(app.config["UPLOAD_FOLDER"], self.pic_path)

    @cached_property
    def edges(self):
        return json.load(file(self.serialized_edge_file))

    @cached_property
    def control_points(self):
        return json.load(file(self.serialized_control_point_file))

    def as_dict(self, camel_case):
        return {
            'id': self.id,
            'picUrl' if camel_case else 'pic_url': self.pic_url,
            'edges': self.edges,
            'size': [self.width, self.height],
            'name': self.name,
            'minHSVValue' if camel_case else 'min_hsv_value': self.min_hsv_value,
            'maxHSVValue' if camel_case else 'max_hsv_value': self.max_hsv_value,
            'medianHSVValue' if camel_case else 'median_hsv_value': self.median_hsv_value,
        }


class DesignImageWrapper(ModelWrapper):
    StoredDir = os.path.join(app.config["UPLOAD_FOLDER"], app.config["DESIGN_IMAGE_FOLDER"])

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