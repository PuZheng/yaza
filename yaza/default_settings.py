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
    #u'文泉驿微米黑': '/usr/local/share/fonts/wqy-ywmh.ttf'
}

UPYUN_ENABLE = True
UPYUN_BUCKETNAME = "image374new"
UPYUN_USERNAME = "xiechao"
UPYUN_PASSWORD = "xiechao123456"
UPYUN_ROOTPATH = "/upload-demo"
UPYUN_UPLOAD_PARAMS = {"x-gmkerl-type": "fix_max", "x-gmkerl-value": 960}
UPYUN_THUMBNAIL_SUFFIX = "!sm"
UPYUN_MD_PIC_SUFFIX = "!md"

QINIU_ENABLED = True

QINIU_CONF = {
    "ACCESS_KEY": "2B9o8hHxkw0PFOwUDd0Yl7TVsH_uXCrHicFeHcUI",
    "SECRET_KEY": "hzeRwpvXzuFzqhkPaWugQLTyHGXltsjNvlvy9zHk",
    "DESIGN_IMAGE_BUCKET": "yaza-design-images",
    "DESIGN_IMAGE_THUMNAIL_SIZE": 96,
}

DESIGN_IMAGE_LIST_API = "http://diancai.snsunion.cn/cloth/index.php/Uility/designimages"

DOWNLOADABLE = False

DESIGNED_FILE_FOLDER = 'static/custom'