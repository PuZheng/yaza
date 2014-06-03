#-*- coding:utf-8 -*-
import os
import sys

import upyun
from yaza.basemain import app


try:
    import requests
except ImportError:
    pass


def alt_path(file_):
    if sys.platform.startswith("win32"):
        return file_.replace(os.path.sep, os.path.altsep)
    else:
        return file_


def upload_image(file_, new_name):
    file_name = alt_path(os.path.join(app.config["UPYUN_ROOTPATH"], new_name))
    up = upyun.UpYun(app.config["UPYUN_BUCKETNAME"], app.config["UPYUN_USERNAME"], app.config["UPYUN_PASSWORD"],
                     timeout=30, endpoint=upyun.ED_AUTO)

    #删除原有文件，重新上传
    up.delete(file_name)

    with open(file_, "rb") as f:
        res = up.put(file_name, f, checksum=False, headers=app.config["UPYUN_UPLOAD_PARAMS"])
        if res:
            return file_name
    return None


def parse_image(file_):
    return "http://" + app.config["UPYUN_BUCKETNAME"] + ".b0.upaiyun.com" + alt_path(
        os.path.join(app.config["UPYUN_ROOTPATH"], file_))


if __name__ == "__main__":
    a = upload_image(r"C:\Users\Public\Pictures\Sample Pictures\Jellyfish.jpg", r"2\nga.jpg")
    print parse_image(a)
