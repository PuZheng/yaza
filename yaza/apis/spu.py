#-*- coding:utf-8 -*-
import json
from hashlib import md5

import requests
from PIL import Image
from StringIO import StringIO

from yaza.basemain import app
from yaza.apis import ModelWrapper
from yaza.utils import do_commit
from yaza.tools.utils import create_shadow_im, detect_edges
from yaza.qiniu_handler import upload_image_str, AlreadyExists


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

    def publish(self):
        self.published = True
        for ocspu in self.ocspu_list:
            for aspect in ocspu.aspect_list:
                # download aspect from qiniu
                r = requests.get(aspect.pic_path)
                black_shadow_im, white_shadow_im = create_shadow_im(
                    Image.open(StringIO(r.content)), ocspu.rgb)
                digest = md5(r.content).hexdigest()
                black_shadow_full_path = '.'.join(['black-shadow',
                                                   str(aspect.id),
                                                   digest,
                                                   'png'])
                white_shadow_full_path = '.'.join(['white-shadow',
                                                   str(aspect.id),
                                                   digest,
                                                   'png'])
                aspect.thumbnail_path = aspect.pic_path + \
                    '?imageView2/0/w/' + \
                    str(app.config['QINIU_CONF']['DESIGN_IMAGE_THUMNAIL_SIZE'])
                si = StringIO()
                black_shadow_im.save(si, 'PNG')
                bucket = app.config["QINIU_CONF"]["SPU_IMAGE_BUCKET"]
                try:
                    aspect.black_shadow_path = upload_image_str(
                        black_shadow_full_path, si.getvalue(), bucket)
                except AlreadyExists, e:
                    print e
                    if not aspect.black_shadow_path:
                        # 出现这种情况， 只能说明以前留存了垃圾数据
                        aspect.black_shadow_path = upload_image_str(
                            black_shadow_full_path, si.getvalue(), bucket, True)
                si.seek(0)
                white_shadow_im.save(si, 'PNG')
                try:
                    aspect.white_shadow_path = upload_image_str(
                        white_shadow_full_path, si.getvalue(), bucket)
                except AlreadyExists, e:
                    print e
                    if not aspect.white_shadow_path:
                        # 出现这种情况， 只能说明以前留存了垃圾数据
                        aspect.white_shadow_path = upload_image_str(
                            white_shadow_full_path, si.getvalue(), bucket, True)
                for dr in aspect.design_region_list:
                    r = requests.get(dr.pic_path)
                    im = Image.open(StringIO(r.content))
                    # 注意， 标注的点， bottom的y大于top的y， 这是由于浏览器
                    # 的原点在左上角
                    edges = detect_edges(im, {
                        'lt': map(int, dr.left_bottom.split(',')),
                        'rt': map(int, dr.right_bottom.split(',')),
                        'rb': map(int, dr.right_top.split(',')),
                        'lb': map(int, dr.left_top.split(',')),
                    })
                    key = '.'.join(['design-region', str(dr.id),
                                    md5(r.content).hexdigest(), 'edges'])
                    bucket = app.config["QINIU_CONF"]["SPU_IMAGE_BUCKET"]
                    try:
                        dr.edge_path = upload_image_str(key, json.dumps(edges),
                                                        bucket)
                    except AlreadyExists, e:
                        print e
                        if not dr.edge_path:
                            # 出现这种情况， 只能说明以前留存了垃圾数据
                            dr.edge_path = upload_image_str(key, json.dumps(edges),
                                                            bucket, True)
                    do_commit(dr)

                do_commit(aspect)

        do_commit(self)

    def unpublish(self):
        self.published = False
        do_commit(self)
