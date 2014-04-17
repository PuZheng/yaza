# -*- coding: UTF-8 -*-
import os
from flask import Flask, render_template, request, redirect, url_for
from flask.ext.principal import (identity_loaded, Principal, RoleNeed,
                                 PermissionDenied)
from flask.ext.babel import gettext as _
from flask.ext.mail import Mail, Message
from sqlalchemy.exc import SQLAlchemyError

app = Flask(__name__, instance_relative_config=True)
app.config.from_object("yaza.default_settings")
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
    __import__('yaza.portal.index')
    installed_ws_apps = ['user']
    installed_apps = ['user', 'image']
    # register web services
    for mod in installed_ws_apps:
        pkg = __import__('yaza.portal.' + mod, fromlist=[mod])
        app.register_blueprint(
            getattr(pkg, mod + '_ws'), url_prefix='/' + mod + '-ws')
    for mod in installed_apps:
        pkg = __import__('yaza.portal.' + mod, fromlist=[mod])
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


import logging
import logging.handlers

logging.basicConfig(level=logging.DEBUG)

file_handler = logging.handlers.TimedRotatingFileHandler(
    app.config["LOG_FILE"], 'D', 1, 10, "utf-8")
file_handler.setFormatter(
    logging.Formatter('%(asctime)s - %(levelname)s: %(message)s'))
file_handler.suffix = "%Y%m%d.log"
app.logger.addHandler(file_handler)

if not app.debug:
    mail = Mail(app)

    @app.errorhandler(PermissionDenied)
    @app.errorhandler(401)
    def permission_denied(error):
        if not current_user.is_anonymous():
            return render_template("error.html",
                                   error=_('You are not permitted to visit '
                                           'this page or perform this action, '
                                           'please contact Administrator to '
                                           'grant you required permission'),
                                   back_url=request.args.get('__back_url__'))
        return redirect(url_for("user.login", error=_("please login"),
                                next=request.url))

    def sender_email(traceback):
        recipients = app.config.get("ERROR_LOG_RECIPIENTS", [])
        if not recipients:
            app.logger.warning('please specify as least one recipient in '
                               ' ERROR_LOG_RECIPIENTS to receive error log')
            return
        if not app.config.get('MAIL_DEFAULT_SENDER'):
            app.logger.warning('please specify DEFAULT_MAIL_SENDER in '
                               'configuration file')
            return
        msg = Message(subject=_("[Error]%(method)s %(url)s",
                                method=request.method, url=request.url),
                      html=traceback.render_summary(),
                      recipients=recipients)
        mail.send(msg)

    @app.errorhandler(Exception)
    def error(error):
        if isinstance(error, SQLAlchemyError):
            from yaza.database import db
            db.session.rollback()
        from werkzeug.debug.tbtools import get_current_traceback
        traceback = get_current_traceback(skip=1, show_hidden_frames=False,
                                          ignore_system_exceptions=True)
        app.logger.error("%s %s" % (request.method, request.url))
        app.logger.error(traceback.plaintext)
        sender_email(traceback)
        return render_template("error.html",
                               error=_("Failed to %(method)s %(url)s",
                                       method=request.method, url=request.url),
                               detail=traceback.render_summary(),
                               back_url=request.args.get("__back_url__", "/"))


from yaza.utils import assert_dir
assert_dir(app.config['UPLOADS_DEFAULT_DEST'])
