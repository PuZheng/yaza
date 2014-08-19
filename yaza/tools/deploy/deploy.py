#! /usr/bin/env python
# -*- coding: UTF-8 -*-
"""
SYNOPSIS:
    Usage: deploy.py [OPTIONS]


OPTIONS:
    -h show this help
    -f <fabfile>
    -c <configfile>
"""
import sys
from getopt import getopt
import json
import pexpect

if __name__ == '__main__':

    opts, _ = getopt(sys.argv[1:], 'hc:f:')

    for o, v in opts:
        if o == '-h':
            print __doc__
            sys.exit(1)
        elif o == '-f':
            fabfile = v
        elif o == '-c':
            configfile = v
        else:
            print "unknown option: " + o
            sys.exit(1)

    try:
        fabfile
        configfile
    except NameError:
        print __doc__
        sys.exit(1)

    config = json.load(file(configfile))

    args = ['fab', '-f', fabfile, '-H', ','.join(config['hosts']), '-u',
            config['user'], '-p', config['password'],
            'deploy:' + ','.join([config['sudoer'],
                                  config['branch'],
                                  config['remote-config']])]
    child = pexpect.spawn(' '.join(args))
    child.logfile_read = sys.stdout
    if 'github-user' in config:
        child.expect('Username for \'https://github.com\':')
        child.sendline(config['github-user'])

    if 'github-password' in config:
        child.expect('Password for \'https://.+@github.com\':')
        child.sendline(config['github-password'])
    child.interact()
