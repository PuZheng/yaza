# -*- coding:utf-8 -*-
import time
import os.path

from flask import render_template, json, request, jsonify
from flask.ext.databrowser import ModelView
from flask.ext.databrowser.sa import SAModell
from flask.ext.babel import lazy_gettext
from flask.ext.login import current_user
from flask.ext.principal import PermissionDenied, Permission, RoleNeed

from yaza import models, const
from yaza.basemain import app
from yaza.apis import wraps
from yaza.database import db
from yaza.admin import serializer
from yaza.models import SPU, OCSPU, Aspect
from yaza.utils import do_commit, get_or_404, random_str
from yaza.portal.spu import spu_ws
from yaza.qiniu_handler import upload_image


class SPUModelView(ModelView):
    edit_template = "spu/spu.html"

    def edit_view(self, id_):
        order_id = operator_id = None

        if "captcha" in request.args:
            try:
                order_id, operator_id = serializer.loads(request.args["captcha"])
            except Exception:
                raise PermissionDenied
        else:
            if current_user.is_authenticated():
                Permission(RoleNeed(const.VENDOR_GROUP)).test()
            else:
                raise PermissionDenied

        spu = self._get_one(id_)
        design_image_list = [wraps(di).as_dict(False) for di in models.DesignImage.query.all()]
        params = {"time": time.time(), "spu": wraps(spu), "design_image_list": json.dumps(design_image_list)}
        if order_id:
            params["order_id"], params["operator_id"] = order_id, operator_id
        return render_template(self.edit_template, **params)



spu_model_view = SPUModelView(modell=SAModell(db=db, model=models.SPU,
                                              label=lazy_gettext(u"spu")))


@spu_ws.route('/spu.json', methods=['POST', 'PUT'])
def spu_api():

    name = json.loads(request.data)['name']
    if request.method == 'POST':
        spu = wraps(do_commit(SPU(name=name)))
    else:
        id_ = json.loads(request.data)['id']
        spu = get_or_404(SPU, id_)
        spu.name = name
        db.session.commit()
    return jsonify(spu.as_dict())


@spu_ws.route('/ocspu.json', methods=['POST', 'PUT'])
def ocspu_api():
    d = json.loads(request.data)
    color = d.get('color')
    spu_id = d.get('spu-id')
    rgb = d.get('rgb')
    cover_path = d.get('cover-path')

    if request.method == 'POST':
        ocspu = wraps(do_commit(OCSPU(color=color, spu_id=spu_id, rgb=rgb,
                                      cover_path=cover_path)))
    else:
        ocspu_id = d.get('id')
        ocspu = get_or_404(OCSPU, ocspu_id)
        if color:
            ocspu.color = color
        if rgb:
            ocspu.rgb = rgb
        if cover_path:
            ocspu.cover_path = cover_path
        (color or rgb or cover_path) and db.session.commit()

    return jsonify({
        'color': ocspu.color,
        'spu-id': ocspu.spu_id,
        'rgb': ocspu.rgb,
        'cover-path': ocspu.cover_path,
    })


@spu_ws.route('/aspect.json', methods=['POST'])
def aspect_api():
    d = json.loads(request.data)
    name = d.get('name')
    pic_path = d.get('pic-path')
    ocspu_id = d.get('ocspu-id')

    if request.method == 'POST':
        aspect = wraps(do_commit(Aspect(name=name, ocspu_id=ocspu_id,
                                        pic_path=pic_path)))
    else:
        aspect_id = d.get('id')
        aspect = get_or_404(Aspect, aspect_id)
        if name:
            aspect.name = name
        if pic_path:
            aspect.pic_path = pic_path
        (name or pic_path) and db.session.commit()
    return jsonify({
        'name': aspect.name,
        'pic-path': aspect.pic_path,
        'ocspu-id': aspect.ocspu_id,
    })
