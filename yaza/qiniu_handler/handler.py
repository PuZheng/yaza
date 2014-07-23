# -*- coding:utf-8 -*-
import hashlib
import os
from StringIO import StringIO
import qiniu.conf
import qiniu.rs
import qiniu.io
from yaza.basemain import app

qiniu.conf.ACCESS_KEY = app.config["QINIU_CONF"]["ACCESS_KEY"]
qiniu.conf.SECRET_KEY = app.config["QINIU_CONF"]["SECRET_KEY"]


class AlreadyExists(Exception):

    def __init__(self, bucket, key):
        self.key = key
        self.bucket = bucket

    @property
    def message(self):
        return '%s exists in %s' % (self.key, self.bucket)

    def __str__(self):
        return self.message



def _md5sum(file, blocksize=65536):
    hash = hashlib.md5()
    with open(file, "rb") as f:
        for block in iter(lambda: f.read(blocksize), ""):
            hash.update(block)
    return hash.hexdigest()


def upload_image(file_path, bucket):
    key = _md5sum(file_path) + os.path.splitext(file_path)[-1]
    return upload_image_str(key, open(file_path, "rb").read(), bucket)


def upload_image_str(key, data, bucket, force=False):
    exists = is_exists(bucket, key)
    if not force and exists:
        raise AlreadyExists(bucket, key)

    if exists:
        delete_file(bucket, key)

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


def delete_file(bucket, key):
    qiniu.rs.Client().delete(bucket, key)


def is_exists(bucket, key):
    ret, err = qiniu.rs.Client().stat(bucket, key)
    return ret is not None


class UploadException(Exception):
    def __init__(self, err, filename):
        self.msg = "error: %s, when uploading %s" % (err, filename)

    def __str__(self):
        return repr(self.msg)
