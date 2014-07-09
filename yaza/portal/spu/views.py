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
from yaza.models import SPU, OCSPU
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

    import pudb; pudb.set_trace()

    color = request.form['color']
    spu_id = request.form['spu-id']
    rgb = request.form['rgb']

    fs = request.files['files[]']
    filename = random_str(32) + '.' + fs.filename.split('.')[-1]
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    fs.save(file_path)
    cover_path = filename
    if app.config.get("QINIU_ENABLED"):
        cover_path = upload_image(file_path,
                                  app.config["QINIU_CONF"]["SPU_IMAGE_BUCKET"])

    ocspu = wraps(do_commit(OCSPU(color=color, spu_id=spu_id, rgb=rgb,
                                  cover_path=cover_path)))
    return jsonify({
        'ocspu': ocspu.as_dict(),
        'status': 'success',
    })
