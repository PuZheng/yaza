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
    fonts = [font_name for font_name in app.config["FONTS_AVAILABLE"] if
             font_name in app.config['FONTS_MAP']]
    config_ = {}
    if fonts:
        config_["FONT_FAMILY_LIST"] = fonts
        config_["DEFAULT_FONT_FAMILY"] = fonts[0]
        for c in [
            'BLACK_ALPHA_THRESHOLD',
            'WHITE_ALPHA_THRESHOLD',
            'LOGIN_REQUIRED',
            'DEFAULT_FONT_SIZE',
            'PPI',
            'DEFAULT_FONT_COLOR',
            'FONT_SIZE_LIST',
            'CONTROL_POINT_NUM',
            'DISPROPORTIONATE',
            'MAGNET_TOLERANCE',
            'DOWNLOADABLE',
            'PLAYGROUND_MARGIN',
            'DEFAULT_PREVIEW_BACKGROUND_COLOR',
            'DESIGN_IMAGE_INTIAL_ZOOMNESS',
            'PREVIEW_DOWNLOADABLE',
            'DESIGN_DOWNLOADABLE',
            'QINIU_CONF',
        ]:
            config_[c] = app.config[c]
    return jsonify(config_)


@app.route("/gen-image", methods=["POST"])
def gen_image():
    data = request.form["data"]
    base64_code = data[data.index(",") + 1:]
    sio = BytesIO()
    sio.write(base64.decodestring(base64_code))
    sio.seek(0)

    return send_file(sio, "image/png", True, str(int(time() * 100)) + ".png")
