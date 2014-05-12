#! /usr/bin/env python
# -*- coding: UTF-8 -*-
"""
本脚本用于创建测试数据，是为了帮助进行随意测试。本脚本基于数据库的初始化脚本
"""
import os
import json
import shutil

from setuptools import Command
from werkzeug.security import generate_password_hash
from PIL import Image

import yaza
from yaza.basemain import app
from yaza.models import (User, Group, SPU, OCSPU, Aspect,
                         DesignImage, DesignRegion)
from yaza.utils import do_commit, assert_dir
from yaza.tools.utils import calc_design_region_image, calc_hsv_values


class InitializeTestDB(Command):
    def initialize_options(self):
        """init options"""
        pass

    def finalize_options(self):
        """finalize options"""
        pass

    def run(self):
        from yaza.tools import build_db
        from yaza import const

        build_db.build_db()

        #change current work path
        os.chdir(os.path.split(yaza.__file__)[0])

        vendor_group = Group.query.get(const.VENDOR_GROUP)
        do_commit(User(name="vendor1",
                       password=generate_password_hash('vendor1', 'pbkdf2:sha256'),
                       group=vendor_group))
        customer_group = Group.query.get(const.CUSTOMER_GROUP)

        do_commit(User(name="customer1",
                       password=generate_password_hash('customer1', 'pbkdf2:sha256'),
                       group=customer_group))

        spu_list_dir = os.path.join(os.path.split(yaza.__file__)[0], "static",
                                    "assets", 'spus')
        for spu_name in os.listdir(spu_list_dir):
            spu_dir = os.path.join(spu_list_dir, spu_name)
            if os.path.isdir(spu_dir):
                assert_dir(os.path.join(app.config['UPLOAD_FOLDER'],
                                        app.config['SPU_IMAGE_FOLDER']))
                if not os.path.exists(os.path.join(app.config['UPLOAD_FOLDER'],
                                                   app.config['SPU_IMAGE_FOLDER'],
                                                   spu_name)):
                    shutil.copytree(spu_dir,
                                    os.path.join(app.config['UPLOAD_FOLDER'],
                                                 app.config['SPU_IMAGE_FOLDER'],
                                                 spu_name))
                self._create_spu(os.path.join(app.config['UPLOAD_FOLDER'],
                                              app.config['SPU_IMAGE_FOLDER'],
                                              spu_name))

        design_image_dir = os.path.join(os.path.split(yaza.__file__)[0],
                                        "static", "assets", 'design-images')
        if os.path.isdir(design_image_dir):
            self._create_design_images(design_image_dir)

    def _create_spu(self, spu_dir):
        config = json.load(open(os.path.join(spu_dir, 'config.json')))
        spu = do_commit(SPU(name=config['name'], cover_name=config['cover']))
        for ocspu_name in os.listdir(spu_dir):
            ocspu_dir = os.path.join(spu_dir, ocspu_name)
            if os.path.isdir(ocspu_dir):
                self._create_ocspu(ocspu_dir, config, spu)

    def _create_ocspu(self, ocspu_dir, config, spu):
        color = config['ocspus'][os.path.basename(ocspu_dir)]['color']
        ocspu = do_commit(OCSPU(spu=spu,
                                color=color))
        for aspect_name in os.listdir(ocspu_dir):
            aspect_dir = os.path.join(ocspu_dir, aspect_name)
            if os.path.isdir(aspect_dir):
                self._create_aspect(aspect_dir, config, ocspu)

    def _create_aspect(self, aspect_dir, config, ocspu):
        for fname in os.listdir(aspect_dir):
            full_path = os.path.join(aspect_dir, fname)
            if os.path.isfile(full_path):
                if fname.split('.')[-1].lower() == 'png':
                    start = os.path.join(os.path.split(yaza.__file__)[0],
                                         app.config['UPLOAD_FOLDER'])
                    pic_path = os.path.relpath(full_path, start)
                    part = 'other'
                    if config['cover'] == os.path.basename(aspect_dir):
                        part = 'front'
                    name = config['aspects'][os.path.basename(aspect_dir)]['name']

                    aspect = do_commit(Aspect(name=name,
                                              pic_path=pic_path,
                                              part=part,
                                              ocspu=ocspu))

        for fname in os.listdir(aspect_dir):
            full_path = os.path.join(aspect_dir, fname)
            if os.path.isdir(full_path):
                self._create_design_region(full_path, config, aspect)

    def _create_design_region(self, design_region_dir, config, aspect):
        for fname in os.listdir(design_region_dir):
            full_path = os.path.join(design_region_dir, fname)
            if os.path.isfile(full_path) and \
                            fname.split('.')[-1].lower() == 'png':
                design_region_name = fname.rsplit('.')[0]
                width, height = \
                    config['designRegions'][design_region_name]['size']
                design_region_name = \
                    config['designRegions'][design_region_name]['name']
                start = os.path.join(os.path.split(yaza.__file__)[0],
                                     app.config['UPLOAD_FOLDER'])
                pic_path = os.path.relpath(full_path, start)

                print "processing image: " + str(full_path)
                calc_design_region_image(full_path)
                hsv_values = calc_hsv_values(Image.open(full_path))
                do_commit(DesignRegion(aspect=aspect,
                                       name=design_region_name,
                                       pic_path=pic_path,
                                       width=width,
                                       part=design_region_name,
                                       height=height,
                                       min_hsv_value=hsv_values['min'],
                                       max_hsv_value=hsv_values['max'],
                                       median_hsv_value=hsv_values['median']))

    def _create_design_images(self, dir):
        assert_dir(os.path.join(app.config['UPLOAD_FOLDER'],
                                app.config['DESIGN_IMAGE_FOLDER']))
        for title, fname in ((u'李宇春', 'liyuchun.png'),
                             (u'马丁.路德', 'martin_luther.png'),
                             (u'小红帽', 'redhat.png'),
                             ('python', 'pyday.png'),
                             (u'列宁', 'lenin.png'),
                             (u'海蒂.拉玛', 'hedylamarr.png')):
            full_path = os.path.join(dir, fname)
            shutil.copy(full_path,
                        os.path.join(app.config['UPLOAD_FOLDER'],
                                     app.config['DESIGN_IMAGE_FOLDER'],
                                     fname))
            do_commit(DesignImage(title=title,
                                  pic_path=os.path.join(
                                      app.config['DESIGN_IMAGE_FOLDER'],
                                      fname)))


if __name__ == "__main__":
    from distutils.dist import Distribution

    InitializeTestDB(Distribution()).run()
