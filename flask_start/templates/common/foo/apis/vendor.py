# -*- coding: UTF-8 -*-
# -*- coding: UTF-8 -*-
from .model_wrapper import ModelWrapper


class VendorWrapper(ModelWrapper):

    @property
    def spu_cnt(self):
        return len(self.spu_list)
