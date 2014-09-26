#! /usr/bin/env python

import sys
import os

import click

__import__('yaza.basemain')
from yaza.qiniu_handler import upload_str


@click.command()
@click.option('--bucket', help='which bucket to load')
def upload_files(bucket):
    """
    upload files (read from stdin) to qiniu
    """
    for l in sys.stdin.xreadlines():
        upload_file(*l.strip().decode('utf-8').split() + [bucket])


def upload_file(file_, key, bucket):
    print "uploading " + file_ + '...'
    upload_str(key, open(file_).read(), bucket, True)

if __name__ == "__main__":
    upload_files()
