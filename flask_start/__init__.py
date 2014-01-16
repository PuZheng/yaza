# -*- coding: UTF-8 -*-
import os
import posixpath
from plumbum import cmd, local


def make_common_project(dir_name):
    while True:
        package_name = raw_input('please input the package name (this will be '
                                 'used as the name for your python package): ')
        package_name = package_name.strip()
        if package_name:
            break
    while True:
        project_name = raw_input('please input the project name: ')
        project_name = project_name.strip()
        if project_name:
            break
    while True:
        host_in_github = raw_input('is this project hosted in a github '
                                   'repository? note, this repository must be '
                                   'empty [y or n] ')
        host_in_github = host_in_github.strip()
        if host_in_github == 'y' or 'n':
            host_in_github = host_in_github == 'y'
            break
    if host_in_github:
        while True:
            github_repos = raw_input('please input the github repository '
                                     'link: ')
            github_repos = github_repos.strip()
            if github_repos:
                break

    this_dir, this_filename = os.path.split(__file__)
    cmd.cp['-r', posixpath.join(this_dir, 'templates', 'common'), dir_name]()
    if host_in_github:
        add_to_github(dir_name, github_repos)


def add_to_github(dir_name, github_repos):
    with local.cwd(dir_name):
        cmd.git['init']()
        cmd.git['remote', 'add', 'origin', github_repos]()
        cmd.git['pull', 'origin', 'master']()
