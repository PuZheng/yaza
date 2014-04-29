#-*- coding:utf-8 -*-
from fabric.api import run, cd, prefix, env, sudo

from yaza.basemain import app


env.hosts = ["42.121.6.193"]
env.passwords = app.config["FAB_PASSWORD"]
env.user = app.config["FAB_USER"]


def deploy():
    with cd('/srv/www/yaza-env'):
        sudo('cd yaza && git pull origin master', user="www-data")
        with prefix("source env/bin/activate"):
            run('python -c "import sys; print sys.path"')
            sudo('cd yaza && pip install -r requirements.txt && python setup.py install', user="www-data")

    sudo('service uwsgi restart')
    sudo('service nginx restart')
