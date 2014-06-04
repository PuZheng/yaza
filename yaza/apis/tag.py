# -*- coding: UTF-8 -*-
from yaza.apis import ModelWrapper


class TagWrapper(ModelWrapper):

    def as_dict(self, camel_case=True):
        return {
            'id': self.id,
            'tag': self.tag,
        }
