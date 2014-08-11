# -*- coding:utf-8 -*-
import os
import json

from fabric.api import cd, sudo, local, env, prefix, run, put, prompt

config = json.load(file(os.path.join(os.path.split(__file__)[0],
                                     "conf.json")))

env.hosts = config["hosts"]
env.password = config["password"]
env.user = config["user"]

yaza_env = "/srv/www/yaza-env"


def sync_code(branch):
    with cd(yaza_env):
        s = run('cd yaza && git branch')
        if branch in [b.lstrip('* ').strip() for b in s.split()]:
            cmd = '&& '.join(['cd yaza', 'git checkout ' + branch,
                            'git pull origin ' + branch])
        else:
            cmd = '&& '.join(['cd yaza', 'git checkout master',
                            'git branch -D ' + branch,
                            'git fetch origin',
                            'git checkout ' + branch])
        run(cmd)

def install():
    with cd(yaza_env):
        with prefix('source env/bin/activate'):
            run("cd yaza && pip install -r requirements.txt -i http://pypi.douban.com/simple && python setup.py develop")
        run('cd yaza/yaza && bower install')

def build(rebuild_data):
    with cd(yaza_env):
        cmd = '&& '.join([
            'cd yaza/yaza/static/vendor/bootswatch-scss',
            'rbenv local 2.1.2',
            'grunt build:flatly',
        ])
        run(cmd)
        with cd('yaza/yaza/static/sass'):
            files = run('find -name "[^_]*.scss"').split('\n')
            files = [fname.strip().lstrip('./').rstrip('.scss') for
                     fname in files]
            print files
            for fname in files:
                run('sass %s.scss ../css/%s.css' % (fname, fname))
        if rebuild_data:
            if prompt('Warning: Are you sure to rebuild data?[yes/no]') == 'yes':
                run('cd yaza/yaza; python tools/make_test_data.py')
            else:
                print 'DATA REBUILDING ABORTED!'

def optimization():
    with cd(yaza_env):
        run('cd yaza/yaza && r.js -o build.js')

def upload2cdn():

    with cd(yaza_env):
        with prefix('source env/bin/activate'):
            run('cd yaza/yaza && cat tools/deploy/upload2cdn-files.txt | python tools/deploy/upload2cdn.py')

def take_effect():
    remote_config = os.path.join(os.path.split(__file__)[0], "remote-config.py")
    with cd(yaza_env):
        put(remote_config, 'yaza/yaza/config.py')
    env.user = config['sudoer']
    sudo("service nginx restart", user='root')
    sudo("service uwsgi restart yaza", user='root')
    env.user = config['user']



def deploy(branch='master', rebuild_data=False):
    sync_code(branch)
    build(rebuild_data)
    optimization()
    upload2cdn()
    take_effect()


if __name__ == "__main__":
    upload()
