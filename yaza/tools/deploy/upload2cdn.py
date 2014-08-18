#! /usr/bin/env python

import sys
import os
from yaza.basemain import app
from yaza.qiniu_handler import upload_str


def upload_file(file_):
    key = os.path.join('static', os.path.relpath(file_, 'static/dist'))
    print "uploading " + file_ + '...'
    upload_str(key, open(file_).read(),
                app.config["QINIU_CONF"]["STATIC_BUCKET"])

if __name__ == "__main__":

    for l in sys.stdin.xreadlines():
        upload_file(l.strip())
