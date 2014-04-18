#-*- coding:utf-8 -*-
import os
from flask import url_for
from yaza.apis import ModelWrapper
from yaza.basemain import app


class OCSPUWrapper(ModelWrapper):
    pass


class AspectWrapper(ModelWrapper):
    @property
    def pic_url(self):
        if self.pic_path:
            ocspu_dir = os.path.join(app.config["UPLOAD_FOLDER"], "ocspu", str(self.ocspu.spu.id), str(self.ocspu.id))

            if os.path.exists(os.path.join(ocspu_dir, self.pic_path)):
                return url_for("admin.pic_render", spu_id=self.ocspu.spu.id, ocspu_id=self.ocspu.id,
                               pic_path=self.pic_path)

        return ""


class DesignRegionWrapper(ModelWrapper):
    @property
    def pic_url(self):
        if self.pic_path:
            spu_id = self.aspect.ocspu.spu.id
            ocspu_id = self.aspect.ocspu.id
            ocspu_dir = os.path.join(app.config["UPLOAD_FOLDER"], "ocspu", str(spu_id), str(ocspu_id))

            if os.path.exists(os.path.join(ocspu_dir, self.pic_path)):
                return url_for("admin.pic_render", spu_id=spu_id, ocspu_id=ocspu_id,
                               pic_path=self.pic_path)

        return ""