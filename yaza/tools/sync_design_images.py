#!/usr/bin/env python
# -*- coding: UTF-8 -*-
import sys
import urllib
import json
from StringIO import StringIO

import qiniu.conf
import qiniu.io
import qiniu.rs

from yaza.basemain import app
from yaza.models import Tag, DesignImage
from yaza.utils import do_commit
from yaza.tools import color_tools


def push_to_qiniu(url, file_name, uptoken, extra):
    data = StringIO(urllib.urlopen(url).read())
    dominant_color = color_tools.dominant_colorz(data, 1)[0]
    ret, err = qiniu.io.put(uptoken, file_name + ".png", data, extra)
    if err is not None:
        sys.stderr.write('error: %s ' % err)
        return None, None

    return "http://" + app.config["QINIU_CONF"]["DESIGN_IMAGE_BUCKET"] + \
           '.qiniudn.com/' + file_name + ".png", dominant_color

if __name__ == '__main__':

    ud = urllib.urlopen(app.config["DESIGN_IMAGE_LIST_API"])
    data = json.loads(ud.read())

    qiniu.conf.ACCESS_KEY = app.config["QINIU_CONF"]["ACCESS_KEY"]
    qiniu.conf.SECRET_KEY = app.config["QINIU_CONF"]["SECRET_KEY"]
    policy = qiniu.rs.PutPolicy(
        app.config["QINIU_CONF"]["DESIGN_IMAGE_BUCKET"])
    uptoken = policy.token()
    extra = qiniu.io.PutExtra()
    extra.mime_type = "text/plain"

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
            # push img to qiniu
            pic_url, dominant_color = push_to_qiniu(record['url'], record['file_name'],
                                                    uptoken, extra)
            if pic_url:
                do_commit(DesignImage(title=record['file_name'],
                                      pic_url=pic_url,
                                      dominant_color=dominant_color,
                                      tags=tag_record_list))
