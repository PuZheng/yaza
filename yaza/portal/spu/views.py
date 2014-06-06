#-*- coding:utf-8 -*-
import time
from flask import render_template, json, request
from flask.ext.databrowser import ModelView
from flask.ext.databrowser.sa import SAModell
from flask.ext.babel import _
from flask.ext.login import current_user
from flask.ext.principal import PermissionDenied, RoleNeed, Permission

from yaza import models, const
from yaza.apis import wraps
from yaza.database import db
from yaza.admin import serializer

class SPUModelView(ModelView):
    edit_template = "spu/spu.html"

    def try_view(self, processed_objs=None):
        if "captcha" in request.args:
            try:
                self.order_id, self.operator_id = serializer.loads(request.args["captcha"])
            except:
                raise PermissionDenied
        else:
            if current_user.is_authenticated():
                Permission(RoleNeed(const.VENDOR_GROUP)).test()
            else:
                raise PermissionDenied

    def edit_view(self, id_):
        spu = self._get_one(id_)
        self.try_view(spu)
        design_image_list = [wraps(di).as_dict(False) for di in models.DesignImage.query.all()]
        params = {"time": time.time(), "spu": wraps(spu), "design_image_list": json.dumps(design_image_list)}
        if getattr(self, "order_id"):
            params["order_id"] = self.order_id

        return render_template(self.edit_template, **params)


spu_model_view = SPUModelView(modell=SAModell(db=db, model=models.SPU, label=_(u"spu")))