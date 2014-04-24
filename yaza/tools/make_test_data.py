#! /usr/bin/env python
# -*- coding: UTF-8 -*-
"""
本脚本用于创建测试数据，是为了帮助进行随意测试。本脚本基于数据库的初始化脚本
"""
import os
import json

from setuptools import Command
from werkzeug.security import generate_password_hash

import yaza


__import__('yaza.basemain')
from yaza.models import (User, Group, SPU, OCSPU, Aspect,
                         DesignImage, DesignRegion)
from yaza.utils import do_commit


class InitializeTestDB(Command):
    def initialize_options(self):
        """init options"""
        pass

    def finalize_options(self):
        """finalize options"""
        pass

    def run(self):
        from yaza.tools import build_db

        build_db.build_db()
        group = do_commit(Group(name="Sample Group"))
        do_commit(User(name="foo",
                       password=generate_password_hash('foo', 'pbkdf2:sha256'),
                       group=group))

        spu_list_dir = os.path.join(os.path.split(yaza.__file__)[0], "static",
                                    "assets", 'spus')

        for spu_name in os.listdir(spu_list_dir):
            spu_dir = os.path.join(spu_list_dir, spu_name)
            if os.path.isdir(spu_dir):
                self._create_spu(spu_dir)

        design_image_dir = os.path.join(os.path.split(yaza.__file__)[0],
                                        "static", "assets", 'builtin-designs')
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
                    aspect = do_commit(Aspect(name=
                                              os.path.basename(aspect_dir),
                                              pic_path=full_path,
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
                do_commit(DesignRegion(aspect=aspect,
                                       name=design_region_name,
                                       pic_path=full_path,
                                       width=width,
                                       height=height))

    def _create_design_images(self, dir):
        do_commit(DesignImage(title=u'李宇春', pic_path=
                              os.path.join(dir, 'liyuchun.png')))
        do_commit(DesignImage(title=u'马丁.路德', pic_path=
                              os.path.join(dir, 'martin_luther.png')))
        do_commit(DesignImage(title=u'小红帽', pic_path=
                              os.path.join(dir, 'redhat.png')))
        do_commit(DesignImage(title=u'python', pic_path=
                              os.path.join(dir, 'pyday.png')))


if __name__ == "__main__":
    from distutils.dist import Distribution

    InitializeTestDB(Distribution()).run()
