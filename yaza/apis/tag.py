# -*- coding: UTF-8 -*-
from yaza.apis import ModelWrapper


class TagWrapper(ModelWrapper):

    def as_dict(self, camel_case=True):
        return {
            'id': self.id,
            'tag': self.tag,
        }

    def __unicode__(self):
        return self.tag

    def __repr__(self):
        return self.tag.encode("utf-8")