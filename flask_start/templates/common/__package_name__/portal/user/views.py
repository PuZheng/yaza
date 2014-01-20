# -*- coding: UTF-8 -*-
from flask import (jsonify, request, render_template, redirect, session,
                   current_app)
from flask.ext.wtf import Form
from flask.ext.babel import _, lazy_gettext
from wtforms import TextField, PasswordField
from wtforms.validators import DataRequired
from werkzeug.security import generate_password_hash
from flask.ext.login import (current_user, login_user, login_required,
                             logout_user)
from flask.ext.principal import Identity, AnonymousIdentity, identity_changed
from flask.ext.databrowser import ModelView, filters, sa, extra_widgets
from flask.ext.databrowser.col_spec import (InputColSpec, ColSpec,
                                            InputHtmlSnippetColSpec)
from flask.ext.databrowser.action import DeleteAction
from flask.ext.principal import Permission

from __package_name__.user import user_ws, user
from __package_name__.models import User, Group
from __package_name__ import utils, apis, const
from __package_name__.exceptions import AuthenticateFailure
from __package_name__.database import db


@user_ws.route('/register', methods=['POST'])
def register_ws():
    name = request.args.get("name", type=str)
    password = request.args.get("password", type=str)
    if not name or not password:
        return u"需要name或者password字段", 403

    user = User.query.filter(User.name == name).first()
    if user:
        return u'用户名已存在, 请更换注册名', 403
    user = utils.do_commit(User(name=name,
                                password=generate_password_hash(
                                    password, 'pbkdf2:sha256'),
                                group=Group.query.get(const.CUSTOMER_GROUP)))
    user = apis.wraps(user)
    return jsonify(user.as_dict(include_auth_token=True)), 201


@user_ws.route("/login", methods=["POST"])
def login_ws():
    name = request.args.get("name", type=str)
    password = request.args.get("password", type=str)
    if not name or not password:
        return u"需要name或者password字段", 403
    try:
        user = apis.user.authenticate(name, password)
    except AuthenticateFailure:
        return u'用户名或者密码错误', 403
    return jsonify(user.as_dict(include_auth_token=True))


class LoginForm(Form):

    username = TextField('username', validators=[DataRequired()])
    password = PasswordField('password', validators=[DataRequired()])


@user.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if request.method == "GET":
        if current_user.is_anonymous():
            return render_template("user/login.html", form=form)
        return redirect("/")
    else:
        if form.validate_on_submit():
            username = form.username.data
            password = form.password.data
            try:
                user = apis.user.authenticate(username, password)
            except AuthenticateFailure:
                return render_template("user/login.html",
                                       error=u"用户名或者密码错误", form=form), 403
            if not login_user(user):
                return render_template("user/login.html",
                                       error=u"登陆失败"), 403

            identity_changed.send(current_app._get_current_object(),
                                  identity=Identity(user.id))
            return redirect(request.args.get('next') or "/")
        return render_template("user/login.html",
                               error=u"请输入用户名及密码", form=form), 403


@user.route("/logout")
@login_required
def logout():
    try:
        logout_user()
    except Exception:  # in case sesson expire
        pass
    for key in ('identity.name', 'identity.auth_type'):
        session.pop(key, None)

    identity_changed.send(current_app._get_current_object(),
                          identity=AnonymousIdentity())
    next_url = request.args.get("next", "/")
    return redirect(next_url)


class UserModelView(ModelView):

    list_template = 'user/list.html'

    @property
    def sortable_columns(self):
        return ['id', 'create_time']

    @property
    def filters(self):
        return [
            filters.Contains('name', self, label=_('name'), name=_('contains')),
            filters.EqualTo('group', self, label=_('group'), name=_('is'),
                            hidden=True),
        ]

    @property
    def list_columns(self):
        return [
            ColSpec('id', _('id')),
            ColSpec('name', _('name')),
            ColSpec('group', _('group')),
            ColSpec('create_time', _('create time'), formatter=lambda v, obj:
                    v.strftime('%Y-%m-%d %H:%M')),
            ColSpec('vendor', _('vendor')),
            ColSpec('retailer', _('retailer'))
        ]

    @property
    def create_columns(self):
        return [
            InputColSpec('name', _('name')),
            InputHtmlSnippetColSpec('password', label=_('password'),
                                    template=
                                    'data_browser__/snippets/password.html',
                                    render_kwargs={'encrypt_method':
                                                   'pbkdf2:sha256'}),
            InputColSpec('group', _('group'), filter_=lambda q:
                         q.filter(Group.id != const.CUSTOMER_GROUP)),
        ]

    @property
    def edit_columns(self):
        return [
            InputColSpec('id', _('id'), disabled=True),
            InputColSpec('create_time', _('create time'), disabled=True),
            InputColSpec('name', _('name')),
            InputHtmlSnippetColSpec('password', label=_('password'),
                                    template=
                                    'data_browser__/snippets/password.html',
                                    render_kwargs={'encrypt_method':
                                                   'pbkdf2:sha256'}),
            InputColSpec('group', _('group'), filter_=lambda q:
                         q.filter(Group.id != const.CUSTOMER_GROUP)),
        ]

    def get_actions(self, processed_objs=None):
        class _DeleteAction(DeleteAction):

            def test(self, *objs):
                if any(obj.group_id == const.SUPER_ADMIN for obj in objs):
                    return 1
                elif any(obj.retailer for obj in objs):
                    return 2
                elif any(obj.vendor for obj in objs):
                    return 3
                return super(_DeleteAction, self).test(*objs)

            @property
            def forbidden_msg_formats(self):
                ret = super(_DeleteAction, self).forbidden_msg_formats
                ret[1] = _("you can't remove administrator account %%s!")
                ret[2] = _('user %%s has retailer, remove the retailer '
                           'at first!')
                ret[3] = _('user %%s has vendor, remove the vendor as first1')
                return ret

        return [_DeleteAction(_("remove"))]


user_model_view = UserModelView(sa.SAModell(User, db, lazy_gettext('User')))
