# -*- coding:utf-8 -*-
from flask import Blueprint

qiniu = Blueprint("qiniu", "qiniu", static_folder="static", template_folder="templates")

import views