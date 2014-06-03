# -*- coding: UTF-8 -*-
from flask import Blueprint


image = Blueprint("image", __name__, static_folder="static",
                  template_folder="templates")

from . import views
