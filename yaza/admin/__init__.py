# -*- coding:utf-8 -*-
import os
from itsdangerous import URLSafeTimedSerializer
from flask import Blueprint, render_template, request, send_from_directory
from flask.ext.login import current_user
from flask.ext.babel import _
from flask.ext.principal import Permission, RoleNeed
import sys

from yaza import const
from yaza.admin import views
from yaza.basemain import data_browser, app, admin_nav_bar
from yaza.models import SPU
from yaza.utils import get_or_404


admin = Blueprint("admin", __name__, static_folder="static", template_folder="templates")

serializer = URLSafeTimedSerializer(secret_key=app.config.get('SECRET_KEY'), salt=app.config.get('SECURITY_SALT'))


@admin.before_request
def test_permission():
    Permission(RoleNeed(const.VENDOR_GROUP)).test()


def register_model_view(model_view, bp, **kwargs):
    label = model_view.modell.label
    from yaza.basemain import admin_nav_bar

    extra_params = {
        "list_view": {
            "nav_bar": admin_nav_bar,
            'title': _('%(label)s list', label=label),
        },
        "create_view": {
            "nav_bar": admin_nav_bar,
            'title': _('create %(label)s', label=label),
        },
        "form_view": {
            "nav_bar": admin_nav_bar,
            'title': _('edit %(label)s', label=label),
        }
    }
    for v in ['list_view', 'create_view', 'form_view']:
        extra_params[v].update(**kwargs.get(v, {}))
    data_browser.register_model_view(model_view, bp, extra_params)


for v in [views.spu_model_view, views.ocspu_model_view, views.aspect_model_view, views.design_result_view,
          views.design_image_view]:
    register_model_view(v, admin)


@admin.route("/")
def index():
    return render_template("admin/index.html", nav_bar=admin_nav_bar)


@admin.route("/generator", methods=["POST"])
def generator_ws():
    from yaza.models import SPU

    spu = SPU.query.get_or_404(request.form["id"])
    order_id = request.form["order_id"]

    security_str = serializer.dumps([order_id, current_user.id])

    # TODO 应该使用公网IP
    return "%sspu/spu/%d?captcha=%s" % (request.host_url, spu.id, security_str)


@admin.route("/design-result-file/<path:file_>")
def design_result_file(file_):
    as_attachment = "download" in request.args
    if sys.platform.startswith("win32"):
        file_ = file_.replace(os.path.sep, os.path.altsep)
    return send_from_directory(app.config["DESIGNED_FILE_FOLDER"], file_, mimetype="image/svg+xml",
                               as_attachment=as_attachment, attachment_filename=os.path.split(file_)[-1].encode("utf-8"))


@admin.route('/spu-url-generator/<int:id_>')
def spu_url_generator(id_):
    return render_template('admin/spu/spu.html', spu=get_or_404(SPU, id_))

