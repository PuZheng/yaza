# -*- coding:utf-8 -*-
import os

from fabric.api import *
from flask import json

import yaza

env.hosts = ["localhost"]
env.passwords = {"localhost": "13321244"}
env.user = "xiechao"


def prepare_deploy():
    branch = "master"
    if "branch in env:":
        branch = env.branch
    with cd("/srv/www/yaza-env"):
        sudo('cd yaza && git pull origin %s' % branch, user="www-data")


def upload():
    base_dir = os.path.join(os.path.split(yaza.__file__)[0], "static\dist")
    config = json.load(file(os.path.join(os.path.split(__file__)[0], "fab.json")))
    included_dirs = [os.path.normpath(os.path.join(base_dir, d)) for d in config["include"].get("dir", [])]
    included_files = [os.path.normpath(os.path.join(base_dir, f)) for f in config["include"].get("file", [])]

    excluded_dirs = [os.path.normpath(os.path.join(base_dir, d)) for d in config["exclude"].get("dir", [])]

    excluded_files = [os.path.normpath(os.path.join(base_dir, f)) for f in config["exclude"].get("file", [])]

    for d in included_dirs:
        for root, dir, files in os.walk(d):
            if root not in excluded_dirs:
                for file_ in files:
                    if os.path.join(root, file_) not in excluded_files:
                        upload_file(os.path.join(root, file_))

    for f in included_files:
        upload_file(f)


def upload_file(file_):
    from yaza.qiniu_handler import upload_text
    from yaza.basemain import app
    print "uploading ..." + file_
    file_name = os.path.relpath(file_, os.path.join(os.path.split(yaza.__file__)[0], "static\dist"))
    upload_text(file_name, open(file_).read(), app.config["QINIU_CONF"]["SPU_IMAGE_BUCKET"])


def deploy():
    prepare_deploy()
    with cd("/srv/www/yaza-env"):
        with prefix('source env/bin/activate'):
            run('python -c "import sys; print sys.path"')
            sudo("cd yaza && pip install -r requirements.txt && python setup.py install", user="www-data")

    sudo("service nginx restart")
    sudo("service uwsgi restart yaza")


if __name__ == "__main__":
    upload()