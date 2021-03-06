# -*- coding: UTF-8 -*-
import codecs
import os
import base64
import time
import datetime

from contextlib import closing
from StringIO import StringIO

from PIL import Image, ImageFont, ImageDraw
from flask import request, jsonify, send_from_directory, json, send_file
from flask.ext.login import current_user
from io import BytesIO

from yaza.basemain import app
from yaza.models import Tag, DesignImage, DesignResult, DesignResultFile
from yaza.portal.image import image
from yaza.utils import do_commit, assert_dir
from yaza.apis import wraps


@image.route('/upload', methods=['POST'])
def upload():
    fs = request.files['file']
    filename = request.form['key']
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    si = StringIO()
    fs.save(si)
    with closing(open(file_path, 'w')) as f:
        s = ('data:' + request.form['type'] + ';base64,' +
             base64.b64encode(si.getvalue()))
        f.write(s)

    # 只能返回空， 否则IE浏览器会打开新的页面
    return 'success'


@image.route("/serve/<path:filename>")
def serve(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@image.route("/edges/<int:design_region_id>")
def detect_edges(design_region_id):
    from yaza.models import DesignRegion

    design_region = DesignRegion.query.get_or_404(design_region_id)
    return jsonify(wraps(design_region).edges)


@image.route("/control-points/<int:design_region_id>")
def calc_control_points(design_region_id):
    from yaza.models import DesignRegion

    design_region = DesignRegion.query.get_or_404(design_region_id)
    return jsonify(wraps(design_region).control_points)


@image.route('/echo', methods=['POST'])
def design_pkg():
    # 将svg打入包
    data = request.form["data"]
    sio = BytesIO()
    sio.write(base64.decodestring(data))
    sio.seek(0)
    return send_file(sio, "application/zip", True, str(int(time.time() * 100))
                     + ".zip")


@image.route('/font-image', methods=['POST'])
def font_image():
    text = request.form['text']
    font_family = request.form['font-family']
    font_size = request.form.get('font-size', type=int)
    font_color = request.form.get('font-color', 'black')
    # font_alignment = request.form.get('font-alighment', 'left-alignment')
    font = ImageFont.truetype(app.config['FONTS_MAP'][font_family], font_size)

    width_height, left_bottom = font.font.getsize(text)
    img = Image.new("RGBA", width_height, (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    # 这里是为了去除顶部的空白
    draw.text((0, -left_bottom[1]), text, fill=font_color, font=font)
    sio = StringIO()
    img.save(sio, format='png')
    return jsonify({
        'data': base64.b64encode(sio.getvalue()),
        'width': img.size[0],
        'height': img.size[1],
    })


@image.route('/tag-list')
def tags():
    return jsonify({
        'data': [wraps(tag).as_dict() for tag in Tag.query]
    })


@image.route('/design-images')
@image.route('/design-images/<int:tag_id>')
def design_images_view(tag_id=None):
    page = request.args.get('page', type=int)
    page_size = request.args.get('page_size', type=int)
    camel_case = request.args.get('camel_case', 0, type=int)
    q = DesignImage.query
    if tag_id:
        q = DesignImage.query.filter(DesignImage.tags.any(Tag.id == tag_id))

    total_cnt = q.count()

    if page is not None and page_size:
        q = q.offset(page * page_size).limit(page_size)
    return jsonify({
        "totalCnt" if camel_case else "total_cnt": total_cnt,
        "data": [wraps(di).as_dict(camel_case) for di in q],
    })


@image.route('/design-save', methods=['POST'])
def design_save():
    order_id = request.form.get("order_id")
    spu_id = request.form.get("spu_id")

    if order_id:
        dir_name = str(order_id)
    else:
        dir_name = str(int(time.time()))

    base_dir = os.path.join(app.config["DESIGNED_FILE_FOLDER"], dir_name)
    assert_dir(base_dir)
    if current_user.is_authenticated():
        user = current_user
    else:
        user = None

    result = DesignResult(user=user, create_time=datetime.datetime.now(),
                          spu_id=spu_id)
    if order_id:
        result.order_id = order_id
    do_commit(result)
    for k, v in json.loads(request.form["data"]).iteritems():
        file_name = os.path.join(base_dir, k + ".svg")
        with codecs.open(file_name, "w", "utf-8") as f:
            f.write(v)
        do_commit(DesignResultFile(
            design_result=result, name=k,
            file_path=os.path.relpath(file_name,
                                      app.config["DESIGNED_FILE_FOLDER"])))

    return dir_name
