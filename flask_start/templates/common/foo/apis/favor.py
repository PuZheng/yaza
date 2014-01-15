# -*- coding: UTF-8 -*-
from . import ModelWrapper


class FavorWrapper(ModelWrapper):

    def as_dict(self):
        return {
            'id': self.id,
            'create_time': self.create_time.strftime('%Y-%m-%d'),
            'spu': self.spu.as_dict(),
            'user': self.user.as_dict(),
            'favor_cnt': len(self.spu.favor_list)
        }
