# -*- coding:utf-8 -*-
from flask import Blueprint

qiniu = Blueprint(__name__, "qiniu", static_folder="static", template_folder="templates")

import views