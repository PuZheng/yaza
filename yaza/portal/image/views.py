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
