# -*- coding: UTF-8 -*-
import time

from flask import render_template

from yaza.basemain import app


@app.route('/demo')
def demo():
    return render_template('demo.html')


@app.route('/model/<int:id_>')
def index(id_):
    from yaza import models

    ocspu_model = models.OCSPU.query.get_or_404(id_)
    from yaza.apis.ocspu import OCSPUWrapper, DesignImageWrapper

    model = OCSPUWrapper(ocspu_model)
    design_image_list = models.DesignImage.query.all()
    return render_template('model.html', time=time.time(), model=model,
                           design_image_list=[DesignImageWrapper(model) for model in design_image_list])
