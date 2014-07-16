# -*- coding:utf-8 -*-
import os
import json

from fabric.api import *

config = json.load(file(os.path.join(os.path.split(__file__)[0], "fab.json")))

env.hosts = config["hosts"]
env.password = config["password"]
env.user = config["user"]
branch = config.get("branch", "master")

yaza_env = "/srv/www/yaza-env"
dist_dir = "yaza/yaza/static/dist"


def prepare_deploy():
    with cd(yaza_env):
        sudo('cd yaza && git pull origin %s && git checkout %s' % (branch, branch), user="www-data")
        sudo('cd yaza && bower install', user="www-data")
        sudo("cd yaza/yaza && r.js -o build.js", user="www-data")


def upload():
    with cd(yaza_env):
        included_dirs = [os.path.normpath(os.path.join(dist_dir, d)) for d in config["include"].get("dir", [])]
        included_files = [os.path.normpath(os.path.join(dist_dir, f)) for f in config["include"].get("file", [])]

        excluded_dirs = [os.path.normpath(os.path.join(dist_dir, d)) for d in config["exclude"].get("dir", [])]
        excluded_files = [os.path.normpath(os.path.join(dist_dir, f)) for f in config["exclude"].get("file", [])]

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
    file_name = os.path.relpath(file_, yaza_env + dist_dir)
    upload_text(file_name, open(file_).read(), app.config["QINIU_CONF"]["SPU_IMAGE_BUCKET"])


def deploy():
    prepare_deploy()
    upload()
    with cd(yaza_env):
        with prefix('source env/bin/activate'):
            run('python -c "import sys; print sys.path"')
            sudo("cd yaza && pip install -r requirements.txt && python setup.py install", user="www-data")

    sudo("service nginx restart")
    sudo("service uwsgi restart yaza")


if __name__ == "__main__":
    upload()