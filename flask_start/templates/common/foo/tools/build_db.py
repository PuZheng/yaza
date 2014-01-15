# -*- coding: utf-8 -*-
import sys
from getopt import getopt
from genuine_ap.basemain import app
from genuine_ap.utils import do_commit
from genuine_ap.models import Group, User, Permission
from genuine_ap import const
from genuine_ap.perm import permissions
from werkzeug.security import generate_password_hash


def build_db():
    msg = u"初始化开始, 数据库是: " + app.config["SQLALCHEMY_DATABASE_URI"]
    app.logger.info(msg)
    import os
    dbstr = app.config["SQLALCHEMY_DATABASE_URI"]
    if dbstr.startswith("sqlite"):
        dir = os.path.split(dbstr[10:])[0]
        if dir and not os.path.exists(dir):
            os.makedirs(dir)
    from genuine_ap.database import db, init_db
    db.drop_all()
    init_db()
    # groups
    do_commit(Group(id=const.CUSTOMER_GROUP, name=u'普通用户',
                    default_url='asdf'))
    do_commit(Group(id=const.VENDOR_GROUP, name=u'vendor',
                    default_url='asdf'))
    do_commit(Group(id=const.RETAILER_GROUP, name=u'retailer',
                    default_url='asee'))
    group_super_admin = do_commit(Group(id=const.SUPER_ADMIN,
                                        name='admin',
                                        default_url='/spu/spu-list'))
    # super admin
    do_commit(User(group=group_super_admin, name=u'admin',
                   password=generate_password_hash(
                       'admin', 'pbkdf2:sha256')))
    # permissions
    for k, v in permissions.items():
            do_commit(Permission(name=k))
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
