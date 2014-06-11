# -*- coding:utf-8 -*-
from flask import Blueprint

from flask.ext.babel import _

from yaza.basemain import data_browser

from .views import spu_model_view

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