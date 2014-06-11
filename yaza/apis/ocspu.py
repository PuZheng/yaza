# -*- coding:utf-8 -*-
import os

from flask import url_for, json
from werkzeug.utils import cached_property

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

    @property
    def size(self):
        return self.width, self.height

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
    def shadow_url(self):
        return self.shadow_path if self.shadow_path.startswith("http") else \
                url_for('image.serve', filename=self.shadow_path)

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
            'shadowUrl' if camel_case else 'shadow_url': self.shadow_url,
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
