# -*- coding: UTF-8 -*-
from flask import Blueprint


user_ws = Blueprint("user-ws", __name__, static_folder="static",
                    template_folder="templates")

user = Blueprint("user", __name__, static_folder="static",
                 template_folder="templates")

from . import views
