# -*- coding: UTF-8 -*-
from flask import redirect, url_for, jsonify
from flask.ext.login import current_user

from yaza.basemain import app


@app.route("/")
def index():
    if current_user.is_authenticated():
        return redirect(current_user.default_url)
    else:
        return redirect(url_for("user.login"))


@app.route("/config")
def config():
    fonts = app.config["FONTS_MAP"].keys()
    config_ = {
        "FONT_FAMILY_LIST": fonts,
        "DEFAULT_PREVIEW_BACKGROUND_COLOR": '#1b5a71',
    }
    if fonts:
        config_["DEFAULT_FONT_FAMILY"] = fonts[0]
    return jsonify(config_)
