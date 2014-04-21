#! /usr/bin/env python
# -*- coding: UTF-8 -*-
"""
本脚本用于创建测试数据，是为了帮助进行随意测试。本脚本基于数据库的初始化脚本
"""
import os
from setuptools import Command
import shutil

from werkzeug.security import generate_password_hash
from yaza.basemain import app

__import__('yaza.basemain')
from yaza.models import (User, Group, SKU, SKC, SPU, OCSPU, Aspect)
from yaza.utils import do_commit, assert_dir


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

        color = [u"blue", u"red", u"white", u"green"]
        size = [1, 2, 3, 4, 5]
        self.add_sku(u"男士T恤", color=color, size=size)

        self.add_sku(u"男士长袖", color=color, size=size)

        self.add_sku(u"女士T恤", color=color, size=size)

        self.add_sku(u"女士长袖", color=color, size=size)

    def add_sku(self, shape, color, size):
        import yaza
        spu = SPU(brief=u"测试用" + shape, shape=shape)
        do_commit(spu)
        for c in color:
            ocspu = OCSPU(spu_id=spu.id, color=c)
            do_commit(ocspu)
            ocspu_dir = os.path.join(os.path.split(yaza.__file__)[0], app.config["UPLOAD_FOLDER"], "ocspu",
                                     str(spu.id), str(ocspu.id))
            assert_dir(ocspu_dir)
            pic_dir = os.path.join(os.path.split(yaza.__file__)[0], "static", "assets")
            filename = shape+c+".jpg"

            if os.path.exists(os.path.join(pic_dir, filename)):
                shutil.copyfile(os.path.join(pic_dir, filename), os.path.join(ocspu_dir, filename))
                aspect = Aspect(ocspu=ocspu, pic_path=filename)
                do_commit(aspect)

            for s in size:
                skc = SKC(size=s, ocspu_id=ocspu.id)
                do_commit(skc)
                do_commit(SKU(skc_id=skc.id))


if __name__ == "__main__":
    from distutils.dist import Distribution

    InitializeTestDB(Distribution()).run()
