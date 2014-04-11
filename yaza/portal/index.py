# -*- coding: UTF-8 -*-
from flask import render_template
from yaza.basemain import app
import time


@app.route('/demo')
def demo():
    return render_template('demo.html')

@app.route('/model/<int:id_>')
def index(id_):
    from yaza import models
    ocspu_model = models.OCSPU.query.get_or_404(id_)
    from yaza.apis.ocspu import OCSPU
    model = OCSPU(ocspu_model)
    return render_template('model.html', time=time.time(), model=model)
