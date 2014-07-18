# -*- coding:utf-8 -*-
import time

from flask import render_template, json, request, jsonify
from flask.ext.databrowser import ModelView
from flask.ext.databrowser.sa import SAModell
from flask.ext.babel import lazy_gettext
from flask.ext.login import current_user
from flask.ext.principal import PermissionDenied, Permission, RoleNeed

from yaza import models, const
from yaza.apis import wraps
from yaza.database import db
from yaza.admin import serializer
from yaza.models import SPU, OCSPU, Aspect, DesignRegion
from yaza.utils import do_commit, get_or_404
from yaza.portal.spu import spu_ws


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


@spu_ws.route('/spu.json/<int:id_>', methods=['GET', 'PUT'])
@spu_ws.route('/spu.json', methods=['POST'])
def spu_api(id_=None):
    if request.method == 'GET':
        spu = get_or_404(SPU, id_)
    elif request.method == 'POST':
        name = json.loads(request.data)['name']
        spu = wraps(do_commit(SPU(name=name)))
    else:
        name = json.loads(request.data)['name']
        id_ = json.loads(request.data)['id']
        spu = get_or_404(SPU, id_)
        spu.name = name
        db.session.commit()
    return jsonify({
        'id': spu.id,
        'name': spu.name,
        'ocspu-id-list': [ocspu.id for ocspu in spu.ocspu_list],
    })


@spu_ws.route('/ocspu.json/<int:id_>', methods=['GET', 'PUT', 'DELETE'])
@spu_ws.route('/ocspu.json', methods=['POST'])
def ocspu_api(id_=None):
    if request.method == 'DELETE':
        ocspu = get_or_404(OCSPU, id_)
        ocspu.delete()
        return jsonify({})

    if request.method == 'GET':
        ocspu = get_or_404(OCSPU, id_)
    else:
        if request.data:
            d = json.loads(request.data)
            color = d.get('color')
            spu_id = d.get('spu-id')
            rgb = d.get('rgb')
            cover_path = d.get('cover-path')

        if request.method == 'POST':
            clone_id = request.args.get('clone-to')
            if clone_id:
                ocspu = get_or_404(OCSPU, clone_id).clone()
            else:
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
        'id': ocspu.id,
        'color': ocspu.color,
        'spu-id': ocspu.spu_id,
        'rgb': ocspu.rgb,
        'cover-path': ocspu.cover_path,
        'aspect-id-list': [aspect.id for aspect in ocspu.aspect_list]
    })


@spu_ws.route('/aspect.json/<int:id_>', methods=['GET', 'PUT', 'DELETE'])
@spu_ws.route('/aspect.json', methods=['POST'])
def aspect_api(id_=None):
    if request.method == 'DELETE':
        aspect = get_or_404(Aspect, id_)
        aspect.delete()
        return jsonify({})

    if request.method == 'GET':
        aspect = get_or_404(Aspect, id_)
    else:
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
        'id': aspect.id,
        'name': aspect.name,
        'pic-path': aspect.pic_path,
        'ocspu-id': aspect.ocspu_id,
        'design-region-id-list': [dr.id for dr in aspect.design_region_list]
    })


@spu_ws.route('/design-region.json/<int:id_>', methods=['GET', 'PUT', 'DELETE'])
@spu_ws.route('/design-region.json', methods=['POST'])
def design_region_api(id_=None):
    if request.method == 'DELETE':
        design_region = get_or_404(DesignRegion, id_)
        design_region.delete()
        return jsonify({})

    if request.method == 'GET':
        design_region = get_or_404(DesignRegion, id_)
    else:
        d = json.loads(request.data)
        name = d.get('name')
        pic_path = d.get('pic-path')
        aspect_id = d.get('aspect-id')
        width = d.get('width')
        height = d.get('height')
        left_top = d.get('left-top')
        right_top = d.get('right-top')
        right_bottom = d.get('right-bottom')
        left_bottom = d.get('left-bottom')

        if request.method == 'POST':
            design_region = wraps(do_commit(DesignRegion(name=name, width=width,
                                                         height=height,
                                                         pic_path=pic_path,
                                                         aspect_id=aspect_id,
                                                         left_top=",".join(map(str, left_top)),
                                                         right_top=",".join(map(str, right_top)),
                                                         right_bottom=",".join(map(str, right_bottom)),
                                                         left_bottom=",".join(map(str, left_bottom))
                                                         )))
        else:
            design_region_id = d.get('id')
            design_region = get_or_404(DesignRegion, design_region_id)
            if name:
                design_region.name = name
            if width:
                design_region.width = width
            if height:
                design_region.height = height
            if pic_path:
                design_region.pic_path = pic_path
            if left_top and right_top and right_bottom and left_bottom:
                design_region.left_top = ",".join(map(str, left_top))
                design_region.right_top = ",".join(map(str, right_top))
                design_region.right_bottom = ",".join(map(str, right_bottom))
                design_region.left_bottom = ",".join(map(str, left_bottom))

            (name or width or height or pic_path) and db.session.commit()

    return jsonify({
        'name': design_region.name,
        'width': design_region.width,
        'height': design_region.height,
        'aspect-id': design_region.aspect.id,
        'pic-path': design_region.pic_path,
        'id': design_region.id,
        'left-top': left_top,
        'right-top': right_top,
        'right-bottom': right_bottom,
        'left-bottom': left_bottom,
    })
