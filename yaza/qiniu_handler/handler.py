# -*- coding:utf-8 -*-
from StringIO import StringIO

from yaza.basemain import app


class AlreadyExists(Exception):
    def __init__(self, bucket, key):
        self.key = key
        self.bucket = bucket

    @property
    def message(self):
        return u'%s exists in %s' % (self.key, self.bucket)

    def __str__(self):
        return self.message


def upload_str(key, data, bucket, force=False, mime_type=''):
    qiniu.conf.ACCESS_KEY = app.config["QINIU_CONF"]["ACCESS_KEY"]
    qiniu.conf.SECRET_KEY = app.config["QINIU_CONF"]["SECRET_KEY"]
    exists = is_exists(bucket, key)
    if exists:
        if force:
            delete_file(bucket, key)
        else:
            raise AlreadyExists(bucket, key)

    policy = qiniu.rs.PutPolicy(bucket)
    uptoken = policy.token()
    extra = qiniu.io.PutExtra()
    if mime_type:
        extra.mime_type = mime_type

    data = StringIO(data)
    ret, err = qiniu.io.put(uptoken, key, data, extra)
    if err is not None:
        app.logger.error('error: %s ' % err)
        raise UploadException(err, key)

    return u"http://%s.qiniudn.com/%s" % (bucket, key)


def delete_file(bucket, key):
    qiniu.rs.Client().delete(bucket, key.encode('utf-8'))


def is_exists(bucket, key):
    ret, err = qiniu.rs.Client().stat(bucket, key.encode('utf-8'))
    return ret is not None


class UploadException(Exception):
    def __init__(self, err, filename):
        self.msg = u"error: %s, when uploading %s" % (err, filename)

    def __str__(self):
        return repr(self.msg)
