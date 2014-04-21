# -*- coding: UTF-8 -*-
import os
from flask import render_template, send_from_directory
from yaza.basemain import app
import time


@app.route('/demo')
def demo():
    return render_template('demo.html')

@app.route('/model/<int:id_>')
def index(id_):
    from yaza import models
    ocspu_model = models.OCSPU.query.get_or_404(id_)
    from yaza.apis.ocspu import OCSPUWrapper
    model = OCSPUWrapper(ocspu_model)
    return render_template('model.html', time=time.time(), model=model)
