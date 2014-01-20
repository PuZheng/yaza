# -*- coding: UTF-8 -*-
from flask import render_template
from __package_name__.basemain import app


@app.route('/')
def index():
    return render_template('index.html')
