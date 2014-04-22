# -*- coding: UTF-8 -*-


class AuthenticateFailure(Exception):

    pass


class BadImageFileException(Exception):
    def __init__(self, file_path):
        self.file_path = file_path

    def __unicode__(self):
        return self.file_path + "无法转换"