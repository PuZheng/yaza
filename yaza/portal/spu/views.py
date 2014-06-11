# -*- coding:utf-8 -*-
import time

from flask import render_template, json, request
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
        params = {"time": time.time(), "spu": wraps(spu), "design_image_list": json.dumps(design_image_list),
                  "downloadable": app.config["DOWNLOADABLE"]}
        if order_id:
            params["order_id"], params["operator_id"] = order_id, operator_id
        return render_template(self.edit_template, **params)


spu_model_view = SPUModelView(modell=SAModell(db=db, model=models.SPU, label=lazy_gettext(u"spu")))