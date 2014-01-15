# -*- coding: UTF-8 -*-
import re
import logging
import os
from flask import Flask, request
from flask.ext.babel import lazy_gettext as _
from flask.ext.upload2 import FlaskUpload
import speaklater
from flask.ext.principal import (identity_loaded, Principal, Permission,
                                 RoleNeed)
from genuine_ap import const


def register_model_view(model_view, bp, **kwargs):
    label = model_view.modell.label

    def nav_bar(model_view):
        if Permission(RoleNeed(const.SUPER_ADMIN)).can():
            return admin_nav_bar
        elif Permission(RoleNeed(const.VENDOR_GROUP)).can():
            return vendor_nav_bar
        elif Permission(RoleNeed(const.RETAILER_GROUP)).can():
            return retailer_nav_bar

    extra_params = {
        "list_view": {
            "nav_bar": nav_bar,
            'title': _('%(label)s list', label=label),
        },
        "create_view": {
            "nav_bar": nav_bar,
            'title': _('create %(label)s', label=label),
        },
        "form_view": {
            "nav_bar": nav_bar,
            'title': _('edit %(label)s', label=label),
        }
    }
    for v in ['list_view', 'create_view', 'form_view']:
        extra_params[v].update(**kwargs.get(v, {}))
    data_browser.register_model_view(model_view, bp, extra_params)

app = Flask(__name__, instance_relative_config=True)
app.config.from_object("genuine_ap.default_settings")
app.config.from_pyfile(os.path.join(os.getcwd(), "config.py"), silent=True)

from flask.ext.babel import Babel
babel = Babel(app)

FlaskUpload(app)


from flask.ext.login import LoginManager, current_user


def init_login():
    from . import models
    from .apis import wraps
    login_manager = LoginManager()
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return wraps(models.User.query.get(user_id))
    login_manager.login_view = 'user.login'

init_login()

from flask.ext.databrowser import DataBrowser
from .database import db
# TODO logger need
data_browser = DataBrowser(app, logger=logging.getLogger('timeline'),
                           upload_folder='static/uploads',
                           plugins=['password'])

from flask.ext.nav_bar import FlaskNavBar
admin_nav_bar = FlaskNavBar(app)
vendor_nav_bar = FlaskNavBar(app)
retailer_nav_bar = FlaskNavBar(app)


def setup_nav_bar():
    from genuine_ap.spu import spu, spu_type_model_view, spu_model_view
    from genuine_ap.sku import sku, sku_model_view
    from genuine_ap.vendor import vendor, vendor_model_view
    from genuine_ap.retailer import retailer, retailer_model_view
    from genuine_ap.user import user, user_model_view
    default_url = speaklater.make_lazy_string(spu_model_view.url_for_list)
    admin_nav_bar.register(spu, name=_('SPU'),
                           default_url=default_url,
                           group=_('SPU related'),
                           enabler=lambda nav: re.match('/spu/spu[^t]',
                                                        request.path))
    default_url = speaklater.make_lazy_string(spu_type_model_view.url_for_list)
    admin_nav_bar.register(spu, name=_('SPU Type'),
                           default_url=default_url,
                           group=_('SPU related'),
                           enabler=lambda nav:
                           request.path.startswith('/spu/sputype'))
    default_url = speaklater.make_lazy_string(sku_model_view.url_for_list)
    admin_nav_bar.register(sku, name=_('SKU'),
                           default_url=default_url)
    default_url = speaklater.make_lazy_string(vendor_model_view.url_for_list)
    admin_nav_bar.register(vendor, name=_('Vendor'),
                           default_url=default_url)
    default_url = speaklater.make_lazy_string(retailer_model_view.url_for_list)
    admin_nav_bar.register(retailer, name=_('Retailer'),
                           default_url=default_url)
    default_url = speaklater.make_lazy_string(user_model_view.url_for_list,
                                              group=const.VENDOR_GROUP)
    admin_nav_bar.register(user, name=_('Account'), default_url=default_url)

    default_url = speaklater.make_lazy_string(
        lambda: vendor_model_view.url_for_object(current_user.vendor))
    vendor_nav_bar.register(vendor, name=_('Vendor Info'),
                            default_url=default_url)
    default_url = speaklater.make_lazy_string(spu_model_view.url_for_list)
    vendor_nav_bar.register(spu, name=_('SPU'),
                            default_url=default_url,
                            group=_('SPU related'),
                            enabler=lambda nav: re.match('/spu/spu[^t]',
                                                         request.path))
    default_url = speaklater.make_lazy_string(spu_type_model_view.url_for_list)
    vendor_nav_bar.register(spu, name=_('SPU Type'), default_url=default_url,
                            group=_('SPU related'), enabler=lambda nav:
                            request.path.startswith('/spu/sputype'))
    default_url = speaklater.make_lazy_string(sku_model_view.url_for_list)
    vendor_nav_bar.register(sku, name=_('SKU'), default_url=default_url)

    default_url = speaklater.make_lazy_string(
        lambda: retailer_model_view.url_for_object(current_user.retailer))
    retailer_nav_bar.register(retailer, name=_('Retailer Info'),
                              default_url=default_url)
    default_url = speaklater.make_lazy_string(spu_model_view.url_for_list)
    retailer_nav_bar.register(spu, name=_('SPU'),
                              default_url=default_url,
                              enabler=lambda nav: re.match('/spu/spu[^t]',
                                                           request.path))

setup_nav_bar()


def register_views():
    from . import index
    installed_ws_apps = ['tag', 'user', 'rcmd', 'spu', 'comment', 'retailer',
                         'favor']
    installed_apps = ['user', 'spu', 'sku', 'vendor', 'retailer', 'user', "share"]
    # register web services
    for mod in installed_ws_apps:
        pkg = __import__('genuine_ap.' + mod, fromlist=[mod])
        app.register_blueprint(getattr(pkg, mod + '_ws'),
                               url_prefix='/' + mod + '-ws')
    for mod in installed_apps:
        pkg = __import__('genuine_ap.' + mod, fromlist=[mod])
        app.register_blueprint(getattr(pkg, mod),
                               url_prefix='/' + mod)


register_views()

principal = Principal(app)


@identity_loaded.connect_via(app)
def on_identity_loaded(sender, identity):
    from genuine_ap.vendor import vendor_model_view
    from genuine_ap.spu import spu_type_model_view, spu_model_view
    from genuine_ap.sku import sku_model_view
    from genuine_ap.retailer import retailer_model_view
    # Set the identity user object
    identity.user = current_user

    if hasattr(current_user, 'group_id'):
        identity.provides.add(RoleNeed(int(current_user.group_id)))
        if current_user.group_id == const.SUPER_ADMIN:
            data_browser.grant_all(identity)
        elif current_user.group_id == const.VENDOR_GROUP:
            if current_user.vendor:
                vendor_model_view.grant_edit(identity,
                                             current_user.vendor.id)
                for spu in current_user.vendor.spu_list:
                    spu_model_view.grant_edit(identity, spu.id)
                    spu_model_view.grant_remove(identity, spu.id)
                spu_model_view.grant_view(identity)
                spu_model_view.grant_create(identity)
                sku_model_view.grant_view(identity)
                sku_model_view.grant_create(identity)
                spu_type_model_view.grant_view(identity)
        elif current_user.group_id == const.RETAILER_GROUP:
            if current_user.retailer:
                retailer_model_view.grant_edit(identity,
                                               current_user.retailer.id)
                spu_model_view.grant_view(identity)
                vendor_model_view.grant_view(identity)


from genuine_ap import utils
utils.assert_dir('static/spu_pics')
utils.assert_dir('static/retailer_pics')
utils.assert_dir('static/spu_type_pics')
utils.assert_dir('static/user_pics')
