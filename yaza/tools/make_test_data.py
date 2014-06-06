#! /usr/bin/env python
# -*- coding: UTF-8 -*-
"""
本脚本用于创建测试数据，是为了帮助进行随意测试。本脚本基于数据库的初始化脚本
"""
import os
import shutil
import json

from setuptools import Command
from werkzeug.security import generate_password_hash
from flask import url_for

import yaza
from yaza.basemain import app
from yaza.models import (User, Group, DesignImage, Tag)
from yaza.utils import do_commit, assert_dir


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

        design_image_dir = os.path.join(os.path.split(yaza.__file__)[0],
                                        "static", "assets", 'design-images')
        if os.path.isdir(design_image_dir):
            self._create_design_images(design_image_dir)

        vendor_group = Group.query.get(const.VENDOR_GROUP)
        do_commit(User(name="vendor1",
                       password=generate_password_hash('vendor1',
                                                       'pbkdf2:sha256'),
                       group=vendor_group))
        customer_group = Group.query.get(const.CUSTOMER_GROUP)

        do_commit(User(name="customer1",
                       password=generate_password_hash('customer1',
                                                       'pbkdf2:sha256'),
                       group=customer_group))

        spu_list_dir = os.path.join(os.path.split(yaza.__file__)[0], "static",
                                    "assets", 'spus')
        for spu_name in os.listdir(spu_list_dir):
            spu_dir = os.path.join(spu_list_dir, spu_name)
            if os.path.isdir(spu_dir):
                assert_dir(os.path.join(app.config['UPLOAD_FOLDER'],
                                        app.config['SPU_IMAGE_FOLDER']))
                if os.path.exists(os.path.join(app.config['UPLOAD_FOLDER'],
                                               app.config['SPU_IMAGE_FOLDER'],
                                               spu_name)):
                    shutil.rmtree(os.path.join(app.config['UPLOAD_FOLDER'],
                                               app.config['SPU_IMAGE_FOLDER'],
                                               spu_name))
                shutil.copytree(spu_dir,
                                os.path.join(app.config['UPLOAD_FOLDER'],
                                             app.config['SPU_IMAGE_FOLDER'],
                                             spu_name))
                utils.create_or_update_spu(
                    os.path.join(app.config['UPLOAD_FOLDER'],
                                 app.config['SPU_IMAGE_FOLDER'], spu_name),
                    os.path.join(os.path.split(yaza.__file__)[0],
                                 app.config["UPLOAD_FOLDER"]))


    def _create_design_images(self, dir):
        assert_dir(os.path.join(app.config['UPLOAD_FOLDER'],
                                app.config['DESIGN_IMAGE_FOLDER']))

        config = json.load(file(os.path.join(dir, "config.json")))

        with app.test_request_context():
            for fname, v in config.items():
                full_path = os.path.join(dir, fname)
                shutil.copy(full_path,
                            os.path.join(app.config['UPLOAD_FOLDER'],
                                        app.config['DESIGN_IMAGE_FOLDER'],
                                        fname))
                title = v['title']
                tags = v['tags']
                tag_record_list = []
                for tag in tags:
                    tag_record = Tag.query.filter(Tag.tag == tag).all()
                    if not tag_record:
                        tag_record = do_commit(Tag(tag=tag))
                    else:
                        tag_record = tag_record[0]
                    tag_record_list.append(tag_record)
                pic_url = url_for('image.serve', filename=os.path.join(
                    app.config['DESIGN_IMAGE_FOLDER'],
                    fname,
                ).replace('\\', '/'))
                # 简单起见, thumbnail不压缩了
                do_commit(DesignImage(title=title,
                                      tags=tag_record_list,
                                      pic_url=pic_url))



if __name__ == "__main__":
    from distutils.dist import Distribution

    InitializeTestDB(Distribution()).run()
