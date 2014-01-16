# -*- coding: UTF-8 -*-
from flask import Blueprint, request
from flask.ext.babel import lazy_gettext as _
import speaklater
from genuine_ap import const
from genuine_ap.basemain import app
from nav_bar import NavBar


user_ws = Blueprint("user-ws", __name__, static_folder="static",
                    template_folder="templates")

user = Blueprint("user", __name__, static_folder="static",
                 template_folder="templates")

from genuine_ap.user.views import user_model_view


from genuine_ap.basemain import register_model_view
sub_nav_bar = NavBar(template=app.jinja_env.get_template('user/nav-bar.html'))
url = speaklater.make_lazy_string(user_model_view.url_for_list,
                                  group=const.VENDOR_GROUP)
sub_nav_bar.register(url, _('Vendor'), enabler=
                     lambda: request.args.get('group', type=int) ==
                     const.VENDOR_GROUP)
url = speaklater.make_lazy_string(user_model_view.url_for_list,
                                  group=const.RETAILER_GROUP)
sub_nav_bar.register(url, _('Retailer'), enabler=
                     lambda: request.args.get('group', type=int) ==
                     const.RETAILER_GROUP)
url = speaklater.make_lazy_string(user_model_view.url_for_list,
                                  group=const.SUPER_ADMIN)
sub_nav_bar.register(url, _('Administrator'), enabler=
                     lambda: request.args.get('group', type=int) ==
                     const.SUPER_ADMIN)

for model_view in [user_model_view]:
    register_model_view(model_view, user,
                        list_view={'sub_nav_bar': sub_nav_bar})
