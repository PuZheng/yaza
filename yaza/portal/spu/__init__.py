# -*- coding:utf-8 -*-
from flask import Blueprint, request
from flask.ext.login import current_user
from flask.ext.principal import PermissionDenied, Permission, RoleNeed

from flask.ext.babel import _

from yaza.basemain import data_browser
from yaza.admin import serializer
from yaza import const

from .views import spu_model_view, ocspu_model_view, design_image_view

spu = Blueprint("spu", __name__, template_folder="templates", static_folder="static")


def register_model_view(model_view, bp, **kwargs):
    label = model_view.modell.label

    extra_params = {
        "list_view": {
            'title': _('%(label)s list', label=label),
        },
        "create_view": {
            'title': _('create %(label)s', label=label),
        },
        "form_view": {
            'title': _('edit %(label)s', label=label),
        }
    }
    for v in ['list_view', 'create_view', 'form_view']:
        extra_params[v].update(**kwargs.get(v, {}))
    data_browser.register_model_view(model_view, bp, extra_params)


register_model_view(spu_model_view, spu)
register_model_view(ocspu_model_view, spu)
register_model_view(design_image_view, spu)


@spu.before_request
def authority():
    if "captcha" in request.args:
        try:
            serializer.loads(request.args["captcha"])
        except Exception:
            raise PermissionDenied
    else:
        if current_user.is_authenticated():
            Permission(RoleNeed(const.VENDOR_GROUP)).test()
        else:
            raise PermissionDenied