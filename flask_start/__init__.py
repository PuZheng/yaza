# -*- coding: UTF-8 -*-
import os
import posixpath
from plumbum import cmd


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
        add_to_github = raw_input('do you want add this project to github? '
                                  '[y or n] ')
        add_to_github = add_to_github.strip()
        if add_to_github == 'y' or 'n':
            add_to_github = add_to_github == 'y'
            break
    if add_to_github:
        while True:
            github_repos = raw_input('please input the github repository '
                                     'link: ')
            github_repos = github_repos.strip()
            if github_repos:
                break
        # TODO add to github


    this_dir, this_filename = os.path.split(__file__)
    import pudb; pudb.set_trace()

    cmd.cp['-r', posixpath.join(this_dir, 'templates', 'common'), dir_name]()
