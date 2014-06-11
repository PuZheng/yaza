# -*- coding:utf-8 -*-
import os
from StringIO import StringIO

import requests
from flask import url_for, json
from werkzeug.utils import cached_property
from PIL import Image

from yaza.apis import ModelWrapper, wraps
from yaza.basemain import app


class OCSPUWrapper(ModelWrapper):
    @property
    def cover(self):
        if self.cover_path:
            return self.cover_path if self.cover_path.startswith("http") else url_for("image.serve",
                                                                                      filename=self.cover_path)
        return ""

    def as_dict(self, camel_case):
        return {
            'id': self.id,
            'aspectList' if camel_case else 'aspect_list':
                [aspect.as_dict(camel_case) for aspect in self.aspect_list],
            'cover': self.cover,
            'color': self.color,
            'rgb': self.rgb,
        }


class AspectWrapper(ModelWrapper):
    @property
    def pic_url(self):
        if self.pic_path:
            return self.pic_path + '?imageView2/0/w/' + str(
                app.config['QINIU_CONF']['ASPECT_MD_SIZE']) \
                if self.pic_path.startswith("http") else url_for("image.serve", filename=self.pic_path)
        return ""

    @property
    def hd_pic_url(self):
        if self.pic_path:
            return self.pic_path if self.pic_path.startswith("http") else url_for("image.serve",
                                                                                  filename=self.pic_path)
        return ""

    @property
    def thumbnail(self):
        if self.thumbnail_path:
            return self.thumbnail_path if self.thumbnail_path.startswith(
                "http") else url_for("image.serve", filename=self.thumbnail_path)
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
        if self.pic_path:
            im = Image.open(StringIO(requests.get(self.pic_url).content))
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
            return self.pic_path if self.pic_path.startswith("http") else url_for("image.serve",
                                                                                  filename=self.pic_path)
        return ""

    @property
    def spu(self):
        return self.aspect.ocspu.spu

    @property
    def ocspu(self):
        return self.aspect.ocspu

    @cached_property
    def edges(self):
        return json.load(file(self.edge_file))

    @cached_property
    def control_points(self):
        return json.load(file(self.control_point_file))

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
    @property
    def thumbnail(self):
        # ref
        # `http://developer.qiniu.com/docs/v6/api/reference/fop/image/imageview2.html`
        if app.config['QINIU_ENABLED']:
            return self.pic_url + '?imageView2/0/w/' + \
                   str(app.config['QINIU_CONF']['DESIGN_IMAGE_THUMNAIL_SIZE'])
        return self.pic_url

    StoredDir = os.path.join(app.config["UPLOAD_FOLDER"],
                             app.config["DESIGN_IMAGE_FOLDER"])

    def as_dict(self, camel_case=True):
        return {
            "id": self.id,
            "title": self.title,
            'picUrl' if camel_case else 'pic_url': self.pic_url,
            'thumbnail': self.thumbnail,
            'tags': [wraps(tag).as_dict(camel_case) for tag in self.tags]
        }
