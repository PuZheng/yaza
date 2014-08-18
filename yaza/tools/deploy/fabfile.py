# -*- coding:utf-8 -*-
import os

from fabric.api import (cd, sudo, prefix, run, put, prompt,
                        settings)


yaza_env = "/srv/www/yaza-env"


def sync_code(branch):
    with cd(yaza_env):
        s = run('cd yaza && git branch')
        if branch in [b.lstrip('* ').strip() for b in s.split()]:
            cmd = '&& '.join(['cd yaza', 'git checkout ' + branch,
                              'git pull origin ' + branch])
        else:
            cmd = '&& '.join(['cd yaza', 'git checkout master',
                              'git fetch origin',
                              'git checkout ' + branch])
        run(cmd)


def install():
    with cd(yaza_env):
        with prefix('source env/bin/activate'):
            cmd = [
                'cd yaza',
                'pip install -r requirements.txt -i http://pypi.douban.com/simple',
                'python setup.py develop',
            ]
            run(' && '.join(cmd))
        run('cd yaza/yaza && bower install')


def build():
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
        prompt_ = 'Warning! Are you sure to rebuild data? this action will ERASE the OLD DATA, please type in "rebuild data" to assure!\n'
        if prompt(prompt_).strip() == 'rebuild data':
            with prefix('source env/bin/activate'):
                run('cd yaza/yaza && python tools/make_test_data.py')
        else:
            print 'DATA REBUILDING ABORTED!'


def optimization():
    with cd(yaza_env):
        run('cd yaza/yaza && r.js -o build.js')


def upload2cdn():

    with cd(yaza_env):
        with prefix('source env/bin/activate'):
            run('cd yaza/yaza && cat tools/deploy/upload2cdn-files.txt | python tools/deploy/upload2cdn.py')


def take_effect(remote_config_file, sudoer):
    with cd(yaza_env):
        put(remote_config_file, 'yaza/yaza/config.py')
    with settings(user=sudoer):
        sudo("service nginx restart")
        sudo("service uwsgi restart yaza")


def deploy(sudoer, branch='master', remote_config_file=None):
    sync_code(branch)
    install()
    build()
    optimization()
    upload2cdn()
    if not remote_config_file:
        remote_config_file = os.path.join(__file__.split()[0],
                                          'remote-config.json')
    take_effect(remote_config_file, sudoer)
