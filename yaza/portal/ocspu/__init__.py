#-*- coding:utf-8 -*-
from flask import Blueprint, render_template, send_from_directory
from flask.ext.babel import _

from yaza.basemain import data_browser


ocspu = Blueprint("ocspu", __name__, template_folder="templates", static_folder="static")


@ocspu.route("/")
def index():
    return render_template("ocspu/index.html")


@ocspu.route("/design-img/<string:pic_path>")
def design_image_render(pic_path):
    from yaza.apis.ocspu import DesignImageWrapper

    return send_from_directory(DesignImageWrapper.StoredDir, pic_path)


from .views import ocspu_model_view, design_image_view


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


register_model_view(ocspu_model_view, ocspu)
register_model_view(design_image_view, ocspu)
