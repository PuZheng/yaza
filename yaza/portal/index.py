# -*- coding: UTF-8 -*-
import json
from flask import redirect, url_for
from flask.ext.login import current_user

from yaza.basemain import app


@app.route("/")
def index():
    if current_user.is_authenticated():
        return redirect(current_user.default_url)
    else:
        return redirect(url_for("user.login"))


@app.route("/fonts")
def fonts():
    return json.dumps([{"font":key} for key in app.config["FONTS_MAP"]])