# -*- coding: UTF-8 -*-
import os
import sys
import base64
import zipfile
from contextlib import closing
from StringIO import StringIO

from flask import request, jsonify, url_for, send_from_directory

from yaza.basemain import app
from yaza.portal.image import image
from yaza.utils import random_str


@image.route('/upload', methods=['POST'])
def upload():
    fs = request.files['files[]']
    filename = random_str(32) + '.' + fs.filename.split('.')[-1]
    fs.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    return jsonify({
        'status': 'success',
        'filename': url_for('image.serve', filename=filename)
    })


@image.route("/serve/<path:filename>")
def serve(filename):
    if sys.platform.startswith("win32"):
        filename = filename.replace(os.path.sep, os.path.altsep)
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@image.route("/edges/<int:design_region_id>")
def detect_edges(design_region_id):
    from yaza.models import DesignRegion
    from yaza.apis import wraps

    design_region = DesignRegion.query.get_or_404(design_region_id)
    return jsonify(wraps(design_region).edges)


@image.route("/control-points/<int:design_region_id>")
def calc_control_points(design_region_id):
    from yaza.models import DesignRegion
    from yaza.apis import wraps

    design_region = DesignRegion.query.get_or_404(design_region_id)
    return jsonify(wraps(design_region).control_points)


@image.route('/design-pkg', methods=['POST'])
def design_pkg():
    # 将svg打入包
    sio = StringIO()
    with closing(zipfile.ZipFile(sio, mode='w')) as zip_pkg:
        for k, v in request.form.items():
            zip_pkg.writestr(k + '.svg', v.encode('utf-8'))
    return base64.b64encode(sio.getvalue())
