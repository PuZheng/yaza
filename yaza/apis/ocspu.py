#-*- coding:utf-8 -*-
import posixpath
from flask import url_for
from yaza.apis import ModelWrapper


class OCSPU(ModelWrapper):
    @property
    def pic_url(self):
        _pic = posixpath.join('assets', self.pic)
        if posixpath.exists(posixpath.join('static', _pic)):
            return url_for('static', filename=_pic)
        return ''