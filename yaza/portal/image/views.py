# -*- coding: UTF-8 -*-
import os

from flask import request, jsonify, url_for, send_from_directory

from yaza.basemain import app
from yaza.portal.image import image
from yaza.utils import random_str


@image.route('/upload', methods=['POST'])
def upload():
    fs = request.files['files[]']
    filename = random_str(32) + '.' + fs.filename.split('.')[-1]
    fs.save(os.path.join(app.config['UPLOADS_DEFAULT_DEST'], filename))
    return jsonify({
        'status': 'success',
        'filename': url_for('image.serve', filename=filename)
    })


@image.route("/serve/<filename>")
def serve(filename):
    return send_from_directory(app.config['UPLOADS_DEFAULT_DEST'], filename)


@image.route("/edges/<int:design_region_id>")
def detect_egdets(design_region_id):
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