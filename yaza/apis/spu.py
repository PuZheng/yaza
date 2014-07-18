#-*- coding:utf-8 -*-
from yaza.apis import ModelWrapper
from yaza.utils import do_commit


class SPUWrapper(ModelWrapper):

    def as_dict(self, camel_case=True):
        return {
            'id': self.id,
            'name': self.name,
            'ocspuList' if camel_case else 'ocspu_list':
            [ocspu.as_dict(camel_case) for ocspu in self.ocspu_list],
        }

    def delete(self):
        for ocspu in self.ocspu_list:
            ocspu.delete()
        do_commit(self, "delete")