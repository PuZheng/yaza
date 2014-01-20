# -*- coding: UTF-8 -*-
import os
from flask import Flask
from flask.ext.principal import (identity_loaded, Principal, RoleNeed)
app = Flask(__name__, instance_relative_config=True)
app.config.from_object("__package_name__.default_settings")
app.config.from_pyfile(os.path.join(os.getcwd(), "config.py"), silent=True)

from flask.ext.babel import Babel
babel = Babel(app)

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


def register_views():
    __import__('__package_name__.portal.index')
    installed_ws_apps = ['user']
    installed_apps = ['user']
    # register web services
    for mod in installed_ws_apps:
        pkg = __import__('__package_name__.portal.' + mod, fromlist=[mod])
        app.register_blueprint(
            getattr(pkg, mod + '_ws'), url_prefix='/' + mod + '-ws')
    for mod in installed_apps:
        pkg = __import__('__package_name__.portal.' + mod, fromlist=[mod])
        app.register_blueprint(getattr(pkg, mod),
                               url_prefix='/' + mod)


register_views()

principal = Principal(app)


@identity_loaded.connect_via(app)
def on_identity_loaded(sender, identity):
    # Set the identity user object
    identity.user = current_user

    if hasattr(current_user, 'group_id'):
        identity.provides.add(RoleNeed(int(current_user.group_id)))
