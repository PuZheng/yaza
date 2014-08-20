#-*- coding:utf-8 -*-
import json
from hashlib import md5
import os.path
import binascii

import requests
from PIL import Image
from StringIO import StringIO

from yaza.basemain import app
from yaza.apis import ModelWrapper
from yaza.utils import do_commit
from yaza.tools.utils import create_shadow_im, detect_edges
from yaza.qiniu_handler import upload_image_str, AlreadyExists, upload_str


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
                r = requests.get(aspect.pic_url)
                # save the local copy
                local_aspect_image_file = os.path.join(app.config['UPLOAD_FOLDER'],
                                                       os.path.basename(aspect.pic_path))
                with open(local_aspect_image_file, 'w') as file_:
                    file_.write(r.content)
                aspect.thumbnail_path = aspect.pic_path + \
                    '?imageView2/0/w/' + \
                    str(app.config['QINIU_CONF']['DESIGN_IMAGE_THUMNAIL_SIZE'])
                duri_path = os.path.basename(aspect.pic_path.rstrip('.png')
                                             + '.duri')
                bucket = app.config["QINIU_CONF"]["SPU_IMAGE_BUCKET"]

                upload_str(duri_path.encode('utf-8'),
                           'data:image/png;base64,' +
                           binascii.b2a_base64(r.content).strip(),
                           bucket, mime_type='text/plain')
                im = Image.open(StringIO(r.content))
                for dr in aspect.design_region_list:
                    r = requests.get(dr.pic_path)
                    black_shadow_im, white_shadow_im = create_shadow_im(
                        Image.open(StringIO(r.content)), ocspu.rgb,
                        app.config['BLACK_ALPHA_THRESHOLD'],
                        app.config['WHITE_ALPHA_THRESHOLD'])
                    digest = md5(black_shadow_im.tostring()).hexdigest()
                    black_shadow_path = '.'.join(['black-shadow',
                                                     str(dr.id),
                                                     digest,
                                                     'png'])
                    digest = md5(white_shadow_im.tostring()).hexdigest()
                    white_shadow_path = '.'.join(['white-shadow',
                                                     str(dr.id),
                                                     digest,
                                                     'png'])
                    # local shadow
                    with open(os.path.join(app.config['UPLOAD_FOLDER'],
                                           black_shadow_path), 'w') as file_:
                        black_shadow_im.save(file_, 'PNG')
                    si = StringIO()
                    black_shadow_im.save(si, 'PNG')
                    try:
                        upload_str(black_shadow_path.encode('utf-8'),
                                   si.getvalue(),
                                   bucket, mime_type='image/png')
                        dr.black_shadow_path = black_shadow_path
                        black_shadow_data_uri_path = black_shadow_path.strip('.png') + '.duri'
                        upload_str(black_shadow_data_uri_path.encode('utf-8'),
                                   'data:image/png;base64,' +
                                   binascii.b2a_base64(si.getvalue()).strip(),
                                   bucket, mime_type='text/plain')
                    except AlreadyExists, e:
                        print e
                        if not dr.black_shadow_path:
                            # 出现这种情况， 只能说明以前留存了垃圾数据
                            upload_str(black_shadow_path.encode('utf-8'),
                                       si.getvalue(),
                                       bucket, True, 'image/png')
                            dr.black_shadow_path = black_shadow_path

                    # local shadow
                    with open(os.path.join(app.config['UPLOAD_FOLDER'],
                                           white_shadow_path), 'w') as file_:
                        white_shadow_im.save(file_, 'PNG')
                    si = StringIO()
                    white_shadow_im.save(si, 'PNG')
                    try:
                        upload_str(white_shadow_path.encode('utf-8'),
                                   si.getvalue(),
                                   bucket, mime_type='image/png')
                        dr.white_shadow_path = white_shadow_path
                        white_shadow_data_uri_path = white_shadow_path.strip('.png') + '.duri'
                        upload_str(white_shadow_data_uri_path,
                                   'data:image/png;base64,' +
                                   binascii.b2a_base64(si.getvalue()).strip(),
                                   bucket, mime_type='text/plain')
                    except AlreadyExists, e:
                        print e
                        if not dr.white_shadow_path:
                            # 出现这种情况， 只能说明以前留存了垃圾数据
                            upload_str(white_shadow_path.encode('utf-8'),
                                       si.getvalue(),
                                       bucket, True, 'image/png')
                            dr.white_shadow_path = white_shadow_path

                    # 注意， 标注的点， bottom的y大于top的y， 这是由于浏览器
                    # 的原点在左上角
                    if dr.left_bottom and dr.right_bottom and dr.right_top \
                        and dr.left_top:
                        edges, _ = detect_edges(im, {
                            'lt': map(int, dr.left_bottom.split(',')),
                            'rt': map(int, dr.right_bottom.split(',')),
                            'rb': map(int, dr.right_top.split(',')),
                            'lb': map(int, dr.left_top.split(',')),
                        })
                    else:
                        edges, _ = detect_edges(im)

                    key = '.'.join(['design-region', str(dr.id),
                                    md5(json.dumps(edges)).hexdigest(),
                                    'edges'])
                    try:
                        dr.edge_path = upload_str(key, json.dumps(edges),
                                                  bucket,
                                                  mime_type='application/json')
                    except AlreadyExists, e:
                        print e
                        if not dr.edge_path:
                            # 出现这种情况， 只能说明以前留存了垃圾数据
                            dr.edge_path = upload_image_str(key,
                                                            json.dumps(edges),
                                                            bucket, True)
                    do_commit(dr)

                do_commit(aspect)

        do_commit(self)

    def unpublish(self):
        self.published = False
        do_commit(self)
