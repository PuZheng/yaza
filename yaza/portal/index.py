# -*- coding: UTF-8 -*-
import time

from flask import render_template

from yaza.basemain import app
from yaza import models
from yaza.utils import get_or_404
from yaza.apis import wraps


@app.route('/demo')
def demo():
    return render_template('demo.html')


@app.route('/spu/<int:id_>')
def spu_view(id_):

    spu = get_or_404(models.SPU, id_)

    design_image_list = [wraps(di) for di in models.DesignImage.query.all()]
    return render_template('spu.html', time=time.time(), spu=spu,
                           design_image_list=design_image_list)
