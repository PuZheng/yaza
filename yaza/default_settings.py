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

FONTS_AVAILABLE = {
    u'文泉驿微米黑',
    u'AR PL UMing CN',
    u'AR PL UKai CN',
    u'腾祥铁山硬隶繁',
}

# font famliy name -> ttf file path
FONTS_MAP = {
    # u'文泉驿微米黑': '/usr/local/share/fonts/wqy-ywmh.ttf'
}

QINIU_ENABLED = True

QINIU_CONF = {
    "ACCESS_KEY": "kQdEWJ6924zBbQYSMuCw71rc-aBNBousngwAtjIE",
    "SECRET_KEY": "Ukh9-yuxS7gvqHN0gJ1jZPGXmHdEARL9BFVLipBE",
    "DESIGN_IMAGE_BUCKET": "yaza-designs",
    "SPU_IMAGE_BUCKET": "yaza-spus",
    "ASPECT_MD_SIZE": 400,
    "DESIGN_IMAGE_THUMNAIL_SIZE": 96,
    "EXPIRY_TIME": 12 * 3600  # 30天
}

DESIGN_IMAGE_LIST_API = "http://diancai.snsunion.cn/cloth/index.php/Uility/designimages"

DESIGNED_FILE_FOLDER = 'static/custom'

ENABLE_DEBUG_TOOLBAR = True

DEBUG_TB_INTERCEPT_REDIRECTS = False

BLACK_ALPHA_THRESHOLD = 80
WHITE_ALPHA_THRESHOLD = 128
