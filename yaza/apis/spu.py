# -*- coding:utf-8 -*-
import json
from hashlib import md5
from binascii import b2a_base64
import os.path
import urllib

import requests
from PIL import Image
from StringIO import StringIO

from yaza.basemain import app
from yaza.apis import ModelWrapper
from yaza.utils import do_commit
from yaza.tools.utils import create_shadow_im, detect_edges
from yaza.qiniu_handler import AlreadyExists, upload_str


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
                r = requests.get(aspect.hd_pic_url)
                # duri of aspect image
                bucket = app.config["QINIU_CONF"]["SPU_IMAGE_BUCKET"]
                duri_path = os.path.basename(aspect.pic_path.rstrip('.png')
                                             + '.duri')
                # duri_path may contain Chinese, so we must quote it
                # (encodeURIComponent in javascript)
                upload_str(urllib.quote(duri_path.encode('utf-8')),
                           'data:image/png;base64,' +
                           b2a_base64(r.content).strip(),
                           bucket, 'text/plain')
                for dr in aspect.design_region_list:
                    r = requests.get(dr.hd_pic_url)
                    dr_im = Image.open(StringIO(r.content))
                    black_shadow_im, white_shadow_im = create_shadow_im(
                        dr_im, ocspu.rgb,
                        app.config['BLACK_ALPHA_THRESHOLD'],
                        app.config['WHITE_ALPHA_THRESHOLD'])
                    digest = md5(black_shadow_im.tostring()).hexdigest()
                    black_shadow_path = urllib.quote('.'.join(['black-shadow',
                                                               str(dr.id),
                                                               digest,
                                                               'png']))
                    black_shadow_data_uri_path = \
                        black_shadow_path.strip('.png') + '.duri'
                    digest = md5(white_shadow_im.tostring()).hexdigest()
                    white_shadow_path = urllib.quote('.'.join(['white-shadow',
                                                               str(dr.id),
                                                               digest,
                                                               'png']))
                    white_shadow_data_uri_path = \
                        white_shadow_path.strip('.png') + '.duri'
                    si = StringIO()
                    black_shadow_im.save(si, 'PNG')
                    try:
                        upload_str(black_shadow_path, si.getvalue(),
                                   bucket, mime_type='image/png')
                        upload_str(black_shadow_data_uri_path,
                                   'data:image/png;base64,' +
                                   b2a_base64(si.getvalue()).strip(),
                                   bucket, mime_type='text/plain')
                        dr.black_shadow_path = black_shadow_path
                    except AlreadyExists, e:
                        print e
                        if not dr.black_shadow_path:
                            # 出现这种情况， 只能说明以前留存了垃圾数据
                            upload_str(black_shadow_path, si.getvalue(),
                                       bucket, True, 'image/png')
                            dr.black_shadow_path = black_shadow_path
                            upload_str(black_shadow_data_uri_path,
                                       'data:image/png;base64,' +
                                       b2a_base64(si.getvalue()).strip(),
                                       bucket, True, mime_type='text/plain')

                    si = StringIO()
                    white_shadow_im.save(si, 'PNG')
                    try:
                        upload_str(white_shadow_path,
                                   si.getvalue(),
                                   bucket,
                                   mime_type='image/png')
                        dr.white_shadow_path = white_shadow_path
                        upload_str(white_shadow_data_uri_path,
                                   'data:image/png;base64,' +
                                   b2a_base64(si.getvalue()).strip(),
                                   bucket, mime_type='text/plain')
                    except AlreadyExists, e:
                        print e
                        if not dr.white_shadow_path:
                            # 出现这种情况， 只能说明以前留存了垃圾数据
                            upload_str(white_shadow_path, si.getvalue(),
                                       bucket, True, 'image/png')
                            dr.white_shadow_path = white_shadow_path
                            upload_str(white_shadow_data_uri_path,
                                       'data:image/png;base64,' +
                                       b2a_base64(si.getvalue()).strip(),
                                       bucket, True, mime_type='text/plain')
                    # 注意， 标注的点， bottom的y大于top的y， 这是由于浏览器
                    # 的原点在左上角
                    if dr.left_bottom and dr.right_bottom and dr.right_top \
                       and dr.left_top:
                        edges, _ = detect_edges(dr_im, {
                            'lt': map(int, dr.left_bottom.split(',')),
                            'rt': map(int, dr.right_bottom.split(',')),
                            'rb': map(int, dr.right_top.split(',')),
                            'lb': map(int, dr.left_top.split(',')),
                        })

                    else:
                        edges, _ = detect_edges(dr_im)

                    edge_path = '.'.join(['design-region', str(dr.id),
                                          md5(json.dumps(edges)).hexdigest(),
                                          'edges'])
                    try:
                        upload_str(edge_path, json.dumps(edges),
                                   bucket,
                                   mime_type='application/json')
                        dr.edge_path = edge_path
                    except AlreadyExists, e:
                        print e
                        if not dr.edge_path:
                            # 出现这种情况， 只能说明以前留存了垃圾数据
                            dr.edge_path = upload_str(edge_path,
                                                      json.dumps(edges),
                                                      bucket, True,
                                                      'application/json')
                            dr.edge_path = edge_path
                    do_commit(dr)

                do_commit(aspect)

        do_commit(self)

    def unpublish(self):
        self.published = False
        do_commit(self)
