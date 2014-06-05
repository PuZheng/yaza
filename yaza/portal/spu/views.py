#-*- coding:utf-8 -*-
import time
import base64
from flask import render_template, json, request
from flask.ext.databrowser import ModelView
from flask.ext.databrowser.sa import SAModell
from flask.ext.babel import _
from flask.ext.login import current_user
from flask.ext.principal import PermissionDenied, RoleNeed, Permission

from yaza import models, const
from yaza.apis import wraps
from yaza.database import db


class SPUModelView(ModelView):
    edit_template = "spu/spu.html"

    def try_view(self, processed_objs=None):
        if current_user.is_authenticated():
            Permission(RoleNeed(const.VENDOR_GROUP)).test()
        else:
            if "captcha" in request.args:
                try:
                    security_str = base64.decodestring(request.args["captcha"])
                    self.order_id, self.operator_id = security_str.split("|")
                except:
                    raise PermissionDenied
            else:
                raise PermissionDenied

    def edit_view(self, id_):
        spu = self._get_one(id_)
        self.try_view(spu)
        design_image_list = [wraps(di).as_dict(False) for di in models.DesignImage.query.all()]
        params = {"time": time.time(), "spu": wraps(spu), "design_image_list": json.dumps(design_image_list)}
        if getattr(self, "order_id"):
            params["order_id"] = int(self.order_id)

        return render_template(self.edit_template, **params)


spu_model_view = SPUModelView(modell=SAModell(db=db, model=models.SPU, label=_(u"spu")))