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
    key = _md5sum(file_path) + os.path.splitext(file_path)[-1]
    return upload_image_str(key, open(file_path, "rb").read(), bucket)


def upload_image_str(key, data, bucket):
    qiniu.conf.ACCESS_KEY = app.config["QINIU_CONF"]["ACCESS_KEY"]
    qiniu.conf.SECRET_KEY = app.config["QINIU_CONF"]["SECRET_KEY"]
    qiniu.rs.Client().delete(bucket, key)

    policy = qiniu.rs.PutPolicy(bucket)
    uptoken = policy.token()
    extra = qiniu.io.PutExtra()
    extra.mime_type = "image/png"

    data = StringIO(data)
    ret, err = qiniu.io.put(uptoken, key, data, extra)
    if err is not None:
        app.logger.error('error: %s ' % err)
        raise UploadException(err, key)
    return "http://" + bucket + '.qiniudn.com/' + key


def upload_text(key, data, bucket):
    qiniu.conf.ACCESS_KEY = app.config["QINIU_CONF"]["ACCESS_KEY"]
    qiniu.conf.SECRET_KEY = app.config["QINIU_CONF"]["SECRET_KEY"]
    ret, err = qiniu.rs.Client().stat(bucket, key)
    if err is not None:
        policy = qiniu.rs.PutPolicy(bucket)
        uptoken = policy.token()
        extra = qiniu.io.PutExtra()
        extra.mime_type = "text/plain"

        data = StringIO(data)
        ret, err = qiniu.io.put(uptoken, key, data, extra)
        if err is not None:
            app.logger.error('error: %s ' % err)
            raise UploadException(err, key)
    else:
        print ret

    if os.path.altsep in key:
        key = key.replace("\\", "%5C")
    return "http://" + bucket + '.qiniudn.com/' + key


class UploadException(Exception):
    def __init__(self, err, filename):
        self.msg = "error: %s, when uploading %s" % (err, filename)

    def __str__(self):
        return repr(self.msg)
