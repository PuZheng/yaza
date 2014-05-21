# -*- coding: UTF-8 -*-
"""
this is the default settings, don't insert into your customized settings!
"""

DEBUG = True
TESTING = True
SECRET_KEY = "5L)0K%,i.;*i/s("
SECURITY_SALT = "sleiuyyao"

# DB config
SQLALCHEMY_DATABASE_URI = "sqlite:///dev.db"
SQLALCHEMY_ECHO = True

UPLOAD_FOLDER = 'static/uploads'
DESIGN_IMAGE_FOLDER = 'design-images'  # relative to UPLOAD_FOLDER
SPU_IMAGE_FOLDER = 'spus'  # relative to UPLOAD_FOLDER
SPU_CONFIG_FILE = 'config.json'
LOG_FILE = 'log.txt'

ERROR_LOG_RECIPIENTS = []


# Flask-Mail related configuration, refer to
# `http://pythonhosted.org/flask-mail/#configuring-flask-mail`
MAIL_SERVER = 'smtp.foo.com'
MAIL_USERNAME = 'username'
MAIL_PASSWORD = 'password'
MAIL_DEFAULT_SENDER = 'user@foo.com'

FIRST_ASPECT_FILENAME = "aa.png"

FONTS_AVAILABLE = {
    u'文泉驿微米黑',
    u'AR PL UMing CN',
    u'AR PL UKai CN',
    u'腾祥铁山硬隶繁',
}
