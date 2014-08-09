# -*- coding:utf-8 -*-
import os
import json

from fabric.api import cd, sudo, local, env, prefix, run

config = json.load(file(os.path.join(os.path.split(__file__)[0], "fab.json")))

env.hosts = config["hosts"]
env.password = config["password"]
env.user = config["user"]

yaza_env = "/srv/www/yaza-env"


def prepare_deploy(branch):
    with cd(yaza_env):
        if branch == 'master':
            cmd = '&& '.join(['cd yaza', 'git checkout master',
                              'git pull origin master'])
        else:
            cmd = '&& '.join(['cd yaza', 'git checkout master',
                             'eval "$(git branch -D ' + branch + ')"',
                             'git fetch origin',
                             'git checkout -b ' + branch])
        run(cmd)
        #with prefix('source env/bin/activate'):
            #run("cd yaza && pip install -r requirements.txt -i http://pypi.douban.com/simple && python setup.py develop")
        run('cd yaza/yaza && bower install')
        cmd = '&& '.join([
            'cd yaza/yaza/static/js/vendor/bootswatch-scss',
            'rbenv local 2.1.2',
            'grunt build:flatly',
        ])
        run(cmd)

def upload2cdn():

    base = config['upload-files']['base']
    included_dirs = config['upload-files']["include"].get("dirs", [])
    included_files = config['upload-files']["include"].get("files", [])
    excluded_dirs = config['upload-files']["exclude"].get("dirs", [])
    excluded_files = config['upload-files']["exclude"].get("files", [])

    def upload_file(file_):
        from yaza.basemain import app
        from yaza.qiniu_handler import upload_text

        print "uploading ..." + file_
        file_name = os.path.relpath(file_, yaza_env + base)
        upload_text(file_name, open(file_).read(),
                    app.config["QINIU_CONF"]["SPU_IMAGE_BUCKET"])

        included_dirs = [os.path.normpath(os.path.join(base, d))
                            for d in included_dirs]
        included_files = [os.path.normpath(os.path.join(base, f))
                            for f in included_files]
        excluded_dirs = [os.path.normpath(os.path.join(base, d))
                            for d in excluded_dirs]
        excluded_files = [os.path.normpath(os.path.join(base, f))
                            for f in excluded_files]
        print included_dirs
        for d in included_dirs:
            for root, dir, files in os.walk(d):
                if root not in excluded_dirs:
                    for file_ in files:
                        if os.path.join(root, file_) not in excluded_files:
                            upload_file(os.path.join(root, file_))

        for f in included_files:
            upload_file(f)


def deploy(branch='master', rebuild=False):
    prepare_deploy(branch)
    if rebuild:
        local('r.js -o build.js')
    local('git checkout ' + branch)
    upload2cdn()

    sudo("service nginx restart")
    sudo("service uwsgi restart yaza")


if __name__ == "__main__":
    upload()
