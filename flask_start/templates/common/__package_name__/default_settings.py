# -*- coding: UTF-8 -*-
"""
this is the default settings, don't insert into your customized settings!
"""

DEBUG = True
SECRET_KEY = "5L)0K%,i.;*i/s("
SECURITY_SALT = "sleiuyyao"

#DB config
SQLALCHEMY_DATABASE_URI = "sqlite:///dev.db"
SQLALCHEMY_ECHO = True

LOCALE = "zh_CN"
BABEL_DEFAULT_LOCALE = "zh_CN"

UPLOADS_DEFAULT_DEST = 'uploads'
