# -*- coding:utf-8 -*-
import hashlib
import os
from StringIO import StringIO
import qiniu.conf
import qiniu.rs
import qiniu.io
from yaza.basemain import app


def _md5sum(file, blocksize=65536):
    hash = hashlib.md5()
    with open(file, "rb") as f:
        for block in iter(lambda: f.read(blocksize), ""):
            hash.update(block)
    return hash.hexdigest()


def upload_image(file_path, bucket):
    filename = _md5sum(file_path) + os.path.splitext(file_path)[-1]
    qiniu.conf.ACCESS_KEY = app.config["QINIU_CONF"]["ACCESS_KEY"]
    qiniu.conf.SECRET_KEY = app.config["QINIU_CONF"]["SECRET_KEY"]
    qiniu.rs.Client().delete(bucket, filename)

    policy = qiniu.rs.PutPolicy(bucket)
    uptoken = policy.token()
    extra = qiniu.io.PutExtra()
    extra.mime_type = "image/png"

    data = StringIO(open(file_path, "rb").read())
    ret, err = qiniu.io.put(uptoken, filename, data, extra)
    if err is not None:
        app.logger.error('error: %s ' % err)
        raise UploadException(err, filename)
    return "http://" + bucket + '.qiniudn.com/' + filename


class UploadException(Exception):
    def __init__(self, err, filename):
        self.msg = "error: %s, when uploading %s" %(err, filename)

    def __str__(self):
        return repr(self.msg)