#! /usr/bin/env python
# -*- coding: UTF-8 -*-
"""
本脚本用于创建测试数据，是为了帮助进行随意测试。本脚本基于数据库的初始化脚本
"""
from setuptools import Command

from werkzeug.security import generate_password_hash

__import__('yaza.basemain')
from yaza.models import (User, Group)
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

if __name__ == "__main__":
    from distutils.dist import Distribution
    InitializeTestDB(Distribution()).run()
