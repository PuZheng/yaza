# -*- coding: UTF-8 -*-

from .model_wrapper import ModelWrapper


class TagWrapper(ModelWrapper):

    @property
    def spu(self):
        return self.sku.spu

    @property
    def vendor(self):
        return self.spu.vendor
