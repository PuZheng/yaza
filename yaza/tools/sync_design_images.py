#!/usr/bin/env python
# -*- coding: UTF-8 -*-
import base64
import json
from StringIO import StringIO
from hashlib import md5

import qiniu.conf
import qiniu.io
import qiniu.rs
import requests

from yaza.basemain import app
from yaza.models import Tag, DesignImage
from yaza.utils import do_commit
from yaza.qiniu_handler import upload_str
from yaza.tools import color_tools


if __name__ == '__main__':

    ud = requests.get(app.config["DESIGN_IMAGE_LIST_API"])
    data = json.loads(ud.content)

    qiniu.conf.ACCESS_KEY = app.config["QINIU_CONF"]["ACCESS_KEY"]
    qiniu.conf.SECRET_KEY = app.config["QINIU_CONF"]["SECRET_KEY"]

    for record in data:
        no_corresponding_image = DesignImage.query.filter(
            DesignImage.title == record['file_name']).count() == 0
        if no_corresponding_image:
            print 'processing...', record
            tag_list = record['tag'].split(',')
            tag_record_list = []
            for tag in tag_list:
                tag_record = Tag.query.filter(Tag.tag == tag).all()
                if tag_record:
                    tag_record = tag_record[0]
                else:
                    tag_record = do_commit(Tag(tag=tag))
                tag_record_list.append(tag_record)

            data = requests.get(record["url"]).content

            # push img to qiniu
            pic_url = upload_str(record['file_name'] + ".png", data,
                                 app.config["QINIU_CONF"]["DESIGN_IMAGE_BUCKET"], True, "image/png")

            upload_str(record['file_name'] + ".duri", "data:image/png;base64," + base64.b64encode(data),
                       app.config["QINIU_CONF"]["DESIGN_IMAGE_BUCKET"], True, "text/plain")

            dominant_color = color_tools.dominant_colorz(StringIO(data), 1)[0]

            if pic_url:
                do_commit(DesignImage(title=record['file_name'],
                                      pic_url=pic_url,
                                      dominant_color=dominant_color,
                                      tags=tag_record_list))
