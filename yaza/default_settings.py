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


# font famliy name -> ttf file path
FONTS_MAP = {
    # u'文泉驿微米黑': '/usr/local/share/fonts/wqy-ywmh.ttf'
}

DESIGN_IMAGE_LIST_API = "http://diancai.snsunion.cn/cloth/index.php/Uility/designimages"

DESIGNED_FILE_FOLDER = 'static/custom'

ENABLE_DEBUG_TOOLBAR = True

DEBUG_TB_INTERCEPT_REDIRECTS = False


# application logic related
BLACK_ALPHA_THRESHOLD = 80  # 黑色阴影(#000)的最大透明度
WHITE_ALPHA_THRESHOLD = 128  # 白色阴影(#fff)的最大透明度
LOGIN_REQUIRED = True  # login required before design online
DEFAULT_FONT_SIZE = 128  # 默认的文字尺寸
PPI = 100 # 默认的PPI, 用于控制生成的定制结果的大小
DEFAULT_FONT_COLOR = 'black' # 默认的字体颜色
FONT_SIZE_LIST = [ # 支持的字体大小
    256,
    224,
    192,
    160,
    128,
    96,
    64,
    32,
]
CONTROL_POINT_NUM = [4, 4] # 控制点尺寸, x, y轴, 越大, 变形效果越真实, 但是运算量越大
DISPROPORTIONATE = False # 是否允许不按比例缩放, 即是否在控制框的边上也出现放大缩小的控制柄
MAGNET_TOLERANCE = 5  # 磁力吸附生效距离
DOWNLOADABLE  = True # 是否可以下载定制结果,
PLAYGROUND_MARGIN = 180 # 留空部分大小
DEFAULT_PREVIEW_BACKGROUND_COLOR = '#1b5a71' # 下载预览默认背景色
DESIGN_IMAGE_INTIAL_ZOOMNESS = 0.7  # 图片素材摆放在定制区上的缩放比例, 1就是占满整个定制区(最长边和定制区的最长边相等)
PREVIEW_DOWNLOADABLE = True # 是否允许非登陆用户在定制页面下载预览
DESIGN_DOWNLOADABLE = True # 是否允许非登陆用户在定制页面允许
QINIU_CONF = {
    "ACCESS_KEY": "kQdEWJ6924zBbQYSMuCw71rc-aBNBousngwAtjIE",
    "SECRET_KEY": "Ukh9-yuxS7gvqHN0gJ1jZPGXmHdEARL9BFVLipBE",
    "DESIGN_IMAGE_BUCKET": "yaza-designs",
    "SPU_IMAGE_BUCKET": "yaza-spus",
    "ASPECT_MD_SIZE": 800,  # 面图片的尺寸大小
    "STATIC_BUCKET": 'yaza-static',
    "DESIGN_IMAGE_THUMNAIL_SIZE": 96, # 设计图thumbnail尺寸
    "ASPECT_THUMNAIL_SIZE": 96, # 面图thumbnail尺寸
    "EXPIRY_TIME": 12 * 3600  # 30天
}

# 可用的字体, 如果系统安装了该字体, 那么该字体会出现在定制页面的字体列表中. 顺序
# 按照这里制定的顺序, 第一个安装的字体, 成为默认字体
FONTS_AVAILABLE = [
    u'文泉驿微米黑',
    u'AR PL UMing CN',
    u'AR PL UKai CN',
    u'腾祥铁山硬隶繁',
    u'Nimbus Mono L',
]
