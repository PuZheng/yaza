#! /usr/bin/env python
# -*- coding: UTF-8 -*-
"""
本脚本用于创建测试数据，是为了帮助进行随意测试。本脚本基于数据库的初始化脚本
"""
from setuptools import Command

from werkzeug.security import generate_password_hash

__import__('yaza.basemain')
from yaza.models import (User, Group, SKU, SKC, SPU, OCSPU)
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

        color = [u"blue", u"red", u"white", u"green"]
        size = [1, 2, 3, 4, 5]
        self.add_sku(u"男士T恤", color=color, size=size)

        self.add_sku(u"男士长袖", color=color, size=size)

        self.add_sku(u"女士T恤", color=color, size=size)

        self.add_sku(u"女士长袖", color=color, size=size)

    def add_sku(self, shape, color, size):
        spu = SPU(brief=u"测试用" + shape, shape=shape)
        do_commit(spu)
        for c in color:
            ocspu = OCSPU(spu_id=spu.id, color=c, pic=shape + c + ".jpg")
            do_commit(ocspu)
            for s in size:
                skc = SKC(size=s, ocspu_id=ocspu.id)
                do_commit(skc)
                do_commit(SKU(skc_id=skc.id))


if __name__ == "__main__":
    from distutils.dist import Distribution

    InitializeTestDB(Distribution()).run()
