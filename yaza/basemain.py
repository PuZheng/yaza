# -*- coding: UTF-8 -*-
import os

from flask import Flask, render_template, request, redirect, url_for
from flask.ext.principal import (identity_loaded, Principal, RoleNeed,
                                 PermissionDenied)
from flask.ext.babel import gettext as _
from flask.ext.mail import Mail, Message
from plumbum import CommandNotFound
import speaklater
from sqlalchemy.exc import SQLAlchemyError
from flask.ext.babel import Babel
from flask.ext.login import LoginManager, current_user
from flask.ext.databrowser import DataBrowser
from flask.ext.upload2 import FlaskUpload
from flask.ext.nav_bar import FlaskNavBar
from apscheduler.schedulers.background import BackgroundScheduler
import logging
import logging.handlers


class MyFlask(Flask):

    @property
    def static_folder(self):
        if self.config.get('DEBUG'):
            return os.path.join(self.root_path, 'static')
        return os.path.join(self.root_path, 'static', 'dist')

    @static_folder.setter
    def static_folder(self, value):
        pass

app = MyFlask(__name__, instance_relative_config=True,
              static_url_path='/static')
app.config.from_object("yaza.default_settings")
app.config.from_pyfile(os.path.join(os.getcwd(), "config.py"), silent=True)


babel = Babel(app)


def url_for_static(fpath, **kwargs):
    if app.config.get('DEBUG'):
        fpath = os.path.join('dist', fpath)

    return url_for('static', filename=fpath, **kwargs)


app.jinja_env.globals['url_for_static'] = url_for_static

# TODO logger need
data_browser = DataBrowser(app, upload_folder=app.config["UPLOAD_FOLDER"],
                           plugins=['password'])


FlaskUpload(app)


admin_nav_bar = FlaskNavBar(app)


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


scheduler = BackgroundScheduler()
scheduler.start()


def register_views():
    from yaza.admin import admin

    app.register_blueprint(admin, url_prefix="/admin")

    __import__('yaza.portal.index')
    installed_apps = ['user', "image", "spu", "qiniu"]
    # register web services
    for mod in installed_apps:
        pkg = __import__('yaza.portal.' + mod, fromlist=[mod])
        from flask import Blueprint

        for k, v in pkg.__dict__.iteritems():
            if isinstance(v, Blueprint):
                app.register_blueprint(v, url_prefix='/' + v.name)


def setup_nav_bar():
    from yaza.admin import views, admin

    default_url = speaklater.make_lazy_string(views.spu_model_view.url_for_list)
    admin_nav_bar.register(
        admin, name=_('SPU'),
        default_url=default_url,
        enabler=lambda nav: request.path.startswith('/admin/spu'))

    default_url = speaklater.make_lazy_string(
        views.design_result_view.url_for_list)
    admin_nav_bar.register(
        admin, name=_(u'定制结果'),
        default_url=default_url,
        enabler=lambda nav: request.path.startswith('/admin/design-result'))

    default_url = speaklater.make_lazy_string(
        views.design_image_view.url_for_list)
    admin_nav_bar.register(
        admin, name=_(u'设计图'), default_url=default_url,
        enabler=lambda nav: request.path.startswith('/admin/design-image'))

    admin_nav_bar.register(
        admin, name=_(u"高清图转换"), default_url="/admin/convert",
        enabler=lambda nav: request.path.startswith("/admin/convert"))

register_views()

setup_nav_bar()

principal = Principal(app)


@identity_loaded.connect_via(app)
def on_identity_loaded(sender, identity):
    # Set the identity user object
    identity.user = current_user

    if hasattr(current_user, 'group_id'):
        identity.provides.add(RoleNeed(int(current_user.group_id)))


logging.basicConfig(level=logging.DEBUG)

file_handler = logging.handlers.TimedRotatingFileHandler(
    app.config["LOG_FILE"], 'D', 1, 10, "utf-8")
file_handler.setFormatter(
    logging.Formatter('%(asctime)s - %(levelname)s: %(message)s'))
file_handler.suffix = "%Y%m%d.log"
app.logger.addHandler(file_handler)


@app.errorhandler(PermissionDenied)
@app.errorhandler(401)
def permission_denied(error):
    if not current_user.is_anonymous:
        return render_template("error.html",
                               error=_('You are not permitted to visit '
                                       'this page or perform this action, '
                                       'please contact Administrator to '
                                       'grant you required permission'),
                               back_url=request.args.get('__back_url__', '/'))
    return redirect(url_for("user.login", error=_("please login"),
                            next=request.url))

if not app.debug:
    mail = Mail(app)

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
assert_dir(app.config['UPLOAD_FOLDER'])

if app.debug and app.config['ENABLE_DEBUG_TOOLBAR']:
    from flask.ext.debugtoolbar import DebugToolbarExtension
    DebugToolbarExtension(app)


def locate_all_fonts():
    try:
        from plumbum.cmd import fc_list
    except CommandNotFound:
        return

    # TODO 这里并没有处理style
    for l in fc_list[': ', 'file', 'family']().split('\n'):
        l = l.strip()
        if l:
            font_path, font_family = l.split(':')[:2]
            font_family_list = font_family.strip().split(',')
            for ff in font_family_list:
                ff = ff.strip()
                if ff in app.config['FONTS_AVAILABLE']:
                    app.config['FONTS_MAP'][ff] = font_path
                    break

    print app.config['FONTS_MAP']

# 如果不是windows系统, 并且没有定义FONTS_MAP, 利用fc-list搜索系统的字体
if not app.config['FONTS_MAP']:
    locate_all_fonts()
