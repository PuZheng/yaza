#! /usr/bin/env python
# -*- coding: UTF-8 -*-
"""
本脚本用于创建测试数据，是为了帮助进行随意测试。本脚本基于数据库的初始化脚本
"""
import os
import shutil

from setuptools import Command
from werkzeug.security import generate_password_hash
from PIL import Image

import yaza
from yaza.basemain import app
from yaza.models import (User, Group, DesignImage)
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
        from yaza.tools import build_db, utils
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
                utils.create_or_update_spu(
                    os.path.join(app.config['UPLOAD_FOLDER'], app.config['SPU_IMAGE_FOLDER'], spu_name),
                    os.path.join(os.path.split(yaza.__file__)[0], app.config["UPLOAD_FOLDER"]))

        design_image_dir = os.path.join(os.path.split(yaza.__file__)[0],
                                        "static", "assets", 'design-images')
        if os.path.isdir(design_image_dir):
            self._create_design_images(design_image_dir)

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
