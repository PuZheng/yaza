# -*- coding: UTF-8 -*-
import posixpath

from flask import _request_ctx_stack, current_app, request, url_for
from flask.ext import login
from flask.ext.principal import identity_changed, Identity, AnonymousIdentity
from itsdangerous import URLSafeTimedSerializer, BadTimeSignature
from sqlalchemy.orm.exc import NoResultFound
from werkzeug.security import check_password_hash

from yaza import const
from yaza.basemain import app
from yaza.apis import ModelWrapper, wraps
from yaza.exceptions import AuthenticateFailure
from yaza.models import User


class UserWrapper(login.UserMixin, ModelWrapper):

    """
    a wrapper of the actual user model
    """
    __serializer__ = URLSafeTimedSerializer(
        secret_key=app.config.get('SECRET_KEY'),
        salt=app.config.get('SECURITY_SALT'))

    @property
    def permissions(self):
        ret = set()
        for group in self.groups:
            for perm in group.permissions:
                ret.add(perm)
        return ret

    @property
    def auth_token(self):
        '''
        get the authentiaction token, see
        `https://flask-login.readthedocs.org/en/latest/#flask.ext.login.
LoginManager.token_loader`_
        '''
        return self.__serializer__.dumps([self.id, self.name,
                                          self.password])

    @property
    def pic_url(self):
        user_pic = posixpath.join('user_pics', str(self.id) + '.jpg')
        if posixpath.exists(posixpath.join('static', user_pic)):
            return url_for('static', filename=user_pic)
        return ''

    @property
    def small_pic_url(self):
        user_pic = posixpath.join('user_pics', str(self.id) + '_small.jpg')
        if posixpath.exists(posixpath.join('static', user_pic)):
            return url_for('static', filename=user_pic)
        return ''

    def as_dict(self, include_auth_token=False):

        ret = {
            'id': self.id,
            'name': self.name,
            'group': self.group.as_dict(),
            'create_time': self.create_time.strftime('%Y-%m-%d'),
            'pic_url': self.pic_url,
            'small_pic_url': self.small_pic_url,
        }
        if include_auth_token:
            ret['auth_token'] = self.auth_token

        return ret

    @property
    def default_url(self):
        from yaza.admin import views
        if self.group_id == const.VENDOR_GROUP:
            return views.ocspu_model_view.url_for_list()
        return self.group.default_url


class GroupWrapper(ModelWrapper):

    def as_dict(self):

        return {
            'id': self.id,
            'name': self.name,
        }


def get_user(id_):
    if not id_:
        return None
        # TODO 这里需要优化
    try:
        return wraps(User.query.filter(User.id == id_).one())
    except NoResultFound:
        return None


def load_user_from_token():
    ctx = _request_ctx_stack.top
    token = request.args.get('auth_token')
    identity = AnonymousIdentity()
    if token is None:
        ctx.user = current_app.login_manager.anonymous_user()
    else:
        try:
            ctx.user = get_user(UserWrapper.__serializer__.loads(token)[0])
            identity = Identity(ctx.user.id)
            # change identity to reset permissions
        except BadTimeSignature:
            ctx.user = current_app.login_manager.anonymous_user()
    identity_changed.send(current_app._get_current_object(), identity=identity)


def authenticate(name, password):
    """
    authenticate a user, test if name and password mathing
    :return: an authenticated User or None if can't authenticated
    :rtype: User
    :raise: exceptions.AuthenticateFailure
    """
    try:
        user = User.query.filter(User.name == name).one()
        if check_password_hash(user.password, password):
            return UserWrapper(user)
        raise AuthenticateFailure("用户名或者密码错误")
    except NoResultFound:
        raise AuthenticateFailure("用户名或者密码错误")
