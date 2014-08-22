# -*- coding: UTF-8 -*-
import base64
from io import BytesIO
from time import time

from flask import redirect, url_for, jsonify, request, send_file
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


@app.route("/gen-image", methods=["POST"])
def gen_image():
    data = request.form["data"]
    base64_code = data[data.index(",") + 1:]
    sio = BytesIO()
    sio.write(base64.decodestring(base64_code))
    sio.seek(0)

    return send_file(sio, "image/png", True, str(int(time() * 100)) + ".png")
