# -*- coding: UTF-8 -*-
from .model_wrapper import ModelWrapper


class CommentWrapper(ModelWrapper):

    def as_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'create_time': self.create_time.strftime('%Y-%m-%d'),
            'spu_id': self.spu_id,
            'spu_name': self.spu.name,
            'user_id': self.user_id,
            'user_name': self.user.name,
            'user_avatar': self.user.small_pic_url,
            'rating': self.rating
        }
