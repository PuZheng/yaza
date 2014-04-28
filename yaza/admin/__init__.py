#-*- coding:utf-8 -*-
from flask import Blueprint, render_template
from flask.ext.babel import _

from yaza.admin import views
from yaza.basemain import data_browser


admin = Blueprint("admin", __name__, static_folder="static", template_folder="templates")


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


for v in [views.spu_model_view, views.ocspu_model_view, views.aspect_model_view]:
    register_model_view(v, admin)


@admin.route("/")
def index():
    return render_template("admin/index.html")
