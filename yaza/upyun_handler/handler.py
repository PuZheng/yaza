#-*- coding:utf-8 -*-
import os
import sys

import upyun


BUCKETNAME = "image374new"

USERNAME = "xiechao"

PASSWORD = "xiechao123456"

rootpath = "/upload-demo"

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
    file_name = alt_path(os.path.join(rootpath, file_))
    up = upyun.UpYun(BUCKETNAME, USERNAME, PASSWORD, timeout=30, endpoint=upyun.ED_AUTO)
    with open(file_, "rb") as f:
        res = up.put(file_name, f, checksum=False)
        if res:
            return file_name
    return None


def parse_image(file_):
    return "http://" + BUCKETNAME + ".b0.upaiyun.com" +  alt_path(os.path.join(rootpath, file_))


if __name__ == "__main__":
    print upload_image(r"C:\Users\Young\Pictures\1\dahuaxiyou.jpg", "1234\dahuaxiyou.jpg")
