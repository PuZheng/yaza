#-*- coding:utf-8 -*-
import re
import types
from wtforms import ValidationError
from wtforms.compat import string_types


class FileUploadValidator(object):
    """
    Validates the field against a user provided regexp.

    :param regex:
        The regular expression string to use. Can also be a compiled regular
        expression pattern.
    :param flags:
        The regexp flags to use, for example re.IGNORECASE. Ignored if
        `regex` is not a string.
    :param message:
        Error message to raise in case of a validation error.
    """
    def __init__(self, test_function, message=None):
        if isinstance(test_function, types.FunctionType):
            self.func = test_function
        self.message = message

    def __call__(self, form, field, message=None):
        if field.data:
            if not all(file_.filename == "" or self.func(file_.filename) for file_ in field.data):
                if message is None:
                    if self.message is None:
                        message = field.gettext('Invalid input.')
                    else:
                        message = self.message

                raise ValidationError(message)