# -*- coding:utf-8 -*-
import os
import colorsys

from flask import url_for, json
from werkzeug.utils import cached_property

from yaza.apis import ModelWrapper, wraps
from yaza.basemain import app
from yaza.tools.color_tools import contrast_color, darker_color
from yaza.qiniu_handler import delete_file
from yaza.utils import do_commit


def split_pic_url(pic_url):
    http_, key = pic_url.split(".qiniudn.com/")
    bucket = http_.split("//")[-1]
    return bucket, key


def delete_file_from_path(path):
    if path.startswith("http"):  # 说明是存在qiniu的
        delete_file(*split_pic_url(path))
    else:
        # 删除本地文件
        local_file = os.path.join(app.config['UPLOAD_FOLDER'], path)
        if os.path.exists(local_file):
            os.unlink(local_file)


class OCSPUWrapper(ModelWrapper):
    @property
    def cover(self):
        if self.cover_path:
            return self.cover_path if self.cover_path.startswith("http") else url_for("image.serve",
                                                                                      filename=self.cover_path)
        return ""

    @property
    def complementary_color(self):
        return contrast_color(self.rgb)

    @property
    def hovered_complement_color(self):
        return darker_color(self.complementary_color, 50)

    def as_dict(self, camel_case=False):
        return {
            'id': self.id,
            'aspectList' if camel_case else 'aspect_list': [aspect.as_dict(camel_case) for aspect in self.aspect_list],
            'cover': self.cover,
            'color': self.color,
            "complementaryColor" if camel_case else "complementaryColor": self.complementary_color,
            "hoveredComplementColor" if camel_case else "hovered_complement_color": self.hovered_complement_color,
            'rgb': self.rgb,
        }

    def delete(self):
        for aspect in self.aspect_list:
            aspect.delete()

        if self.cover_path:
            delete_file_from_path(self.cover_path)

        do_commit(self, "delete")


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
    def black_shadow_url(self):
        return self.black_shadow_path + '?imageView2/0/w/' + str(
            app.config['QINIU_CONF']['ASPECT_MD_SIZE']) \
            if self.black_shadow_path.startswith("http") else \
            url_for('image.serve', filename=self.black_shadow_path)

    @property
    def white_shadow_url(self):
        return self.white_shadow_path + '?imageView2/0/w/' + str(
            app.config['QINIU_CONF']['ASPECT_MD_SIZE']) \
            if self.white_shadow_path.startswith("http") else \
            url_for('image.serve', filename=self.white_shadow_path)

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
            'blackShadowUrl' if camel_case else 'black_shadow_url': self.black_shadow_url,
            'whiteShadowUrl' if camel_case else 'white_shadow_url': self.white_shadow_url,
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

    def delete(self):
        for design_region in self.design_region_list:
            design_region.delete()

        if self.pic_path:
            delete_file_from_path(self.pic_path)

        if self.black_shadow_path:
            delete_file_from_path(self.black_shadow_path)

        if self.white_shadow_path:
            delete_file_from_path(self.white_shadow_path)

        if self.thumbnail_path:
            delete_file_from_path(self.thumbnail_path)

        do_commit(self, "delete")


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
        }

    def delete(self):
        if self.pic_path:
            delete_file_from_path(self.pic_path)
        if os.path.exists(self.edge_file):
            os.unlink(self.edge_file)
        if os.path.exists(self.control_point_file):
            os.unlink(self.control_point_file)

        do_commit(self, "delete")


class DesignImageWrapper(ModelWrapper):
    background_colorz = ["#FFFFFF", "#808080"]  # white, dimgray

    @property
    def thumbnail(self):
        # ref
        # `http://developer.qiniu.com/docs/v6/api/reference/fop/image/imageview2.html`
        if app.config['QINIU_ENABLED']:
            return self.pic_url + '?imageView2/0/w/' + \
                   str(app.config['QINIU_CONF']['DESIGN_IMAGE_THUMNAIL_SIZE'])
        return self.pic_url

    @property
    def background_color(self):
        red = int(self.dominant_color[1:3], 16)
        green = int(self.dominant_color[3:5], 16)
        blue = int(self.dominant_color[5:7], 16)

        hsv = colorsys.rgb_to_hsv(red / 255.0, green / 255.0, blue / 255.0)
        return self.background_colorz[hsv[2] > 0.8]

    StoredDir = os.path.join(app.config["UPLOAD_FOLDER"],
                             app.config["DESIGN_IMAGE_FOLDER"])

    def as_dict(self, camel_case=True):
        return {
            "id": self.id,
            "title": self.title,
            'picUrl' if camel_case else 'pic_url': self.pic_url,
            'thumbnail': self.thumbnail,
            'tags': [wraps(tag).as_dict(camel_case) for tag in self.tags],
            'backgroundColor' if camel_case else "background_color": self.background_color
        }
