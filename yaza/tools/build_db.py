# -*- coding: utf-8 -*-
import sys
from getopt import getopt

from yaza import const
from yaza.basemain import app
from yaza.utils import do_commit
from yaza.models import Group


def build_db():
    msg = u"初始化开始, 数据库是: " + app.config["SQLALCHEMY_DATABASE_URI"]
    app.logger.info(msg)
    import os

    dbstr = app.config["SQLALCHEMY_DATABASE_URI"]
    if dbstr.startswith("sqlite"):
        dir = os.path.split(dbstr[10:])[0]
        if dir and not os.path.exists(dir):
            os.makedirs(dir)
    from yaza.database import db, init_db

    db.drop_all()
    init_db()
    do_commit(Group(id=const.SUPER_ADMIN, name=u'admin',
                    default_url='/admin'))
    do_commit(Group(id=const.VENDOR_GROUP, name=u'vendor',
                    default_url='/spu'))
    do_commit(Group(id=const.CUSTOMER_GROUP, name=u'普通用户',
                    default_url='/user'))
    msg = u"初始化完成"
    app.logger.info(msg)


if __name__ == "__main__":
    opts, _ = getopt(sys.argv[1:], "s:h")
    for o, v in opts:
        if o == "-h":
            print __doc__
            exit(1)
        else:
            print "unknown option: " + o
    build_db()
