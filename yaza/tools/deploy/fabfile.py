# -*- coding:utf-8 -*-
import os
import json

from fabric.api import cd, sudo, local, env, prefix, run

config = json.load(file(os.path.join(os.path.split(__file__)[0],
                                     "conf.json")))

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
        with prefix('source env/bin/activate'):
            run("cd yaza && pip install -r requirements.txt -i http://pypi.douban.com/simple && python setup.py develop")
        run('cd yaza/yaza && bower install')
        cmd = '&& '.join([
            'cd yaza/yaza/static/css/vendor/bootswatch-scss',
            'rbenv local 2.1.2',
            'grunt build:flatly',
        ])
        run(cmd)

def optimization():
    with cd(yaza_env):
        run('cd yaza/yaza && r.js -o build.js')

def upload2cdn():

    with cd(yaza_env):
        with prefix('source env/bin/activate'):
            run('cd yaza/yaza && cat tools/upload2cdn-files.txt | python tools/upload2cdn.py')


def deploy(branch='master'):
    prepare_deploy(branch)
    optimization()
    upload2cdn()

    sudo("service nginx restart")
    sudo("service uwsgi restart yaza")


if __name__ == "__main__":
    upload()
