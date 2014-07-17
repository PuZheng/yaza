# -*- coding:utf-8 -*-
import time
import sys
from flask import request, json, jsonify
import base64
import hmac
from hashlib import sha1

from yaza.basemain import app
from yaza.portal.qiniu import qiniu

time_ = int(time.time())


@qiniu.route("/token")
def token():
    global time_
    if request.args.get("key"):
        scope = ":".join([request.args["bucket"], request.args["key"]])
    else:
        scope = request.args["bucket"]

    expiry_time = app.config["QINIU_CONF"].get("EXPIRY_TIME", sys.maxint)
    now = int(time.time())
    if now - time_ > expiry_time:
        time_ = now
    return jsonify(token=make_token(scope, time_ + expiry_time), time=time_)


def make_token(scope, deadline):
    policy = {'scope': scope, 'deadline': deadline}
    put_policy = json.dumps(policy)
    encoded_put_policy = base64.urlsafe_b64encode(put_policy)
    sign = hmac.new(app.config["QINIU_CONF"]["SECRET_KEY"], encoded_put_policy, sha1).digest()
    encoded_sign = base64.urlsafe_b64encode(sign)
    return ":".join([app.config["QINIU_CONF"]["ACCESS_KEY"], encoded_sign,
                     encoded_put_policy])
