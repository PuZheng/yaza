# -*- coding: UTF-8 -*-
from flask import redirect, url_for, render_template, request, abort
from flask.ext.babel import _
from flask.ext.login import login_required, current_user
from .basemain import app
from genuine_ap.models import SKU


@app.route('/')
@login_required
def index():
    return redirect(current_user.default_url)


@app.route("/download/<filename>")
def download(filename):
    return redirect(url_for("static", filename=filename))


@app.route('/no_vendor')
def no_vendor():
    return render_template('no_vendor.html', title=_('error'))

@app.route('/no_retailer')
def no_retailer():
    return render_template('no_retailer.html', title=_('error'))


@app.route("/share")
def share():
    sku = SKU.query.filter(SKU.token == request.args.get("tag")).first()
    if sku is None or sku.spu is None:
        abort(404)
    return render_template("share/spu.html", spu=sku.spu)
