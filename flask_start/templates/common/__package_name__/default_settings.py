# -*- coding: UTF-8 -*-
"""
this is the default settings, don't insert into your customized settings!
"""

DEBUG = True
TESTING = True
SECRET_KEY = "5L)0K%,i.;*i/s("
SECURITY_SALT = "sleiuyyao"

#DB config
SQLALCHEMY_DATABASE_URI = "sqlite:///dev.db"
SQLALCHEMY_ECHO = True

UPLOADS_DEFAULT_DEST = 'uploads'
LOG_FILE = 'log.txt'

ERROR_LOG_RECIPIENTS = []


# Flask-Mail related configuration, refer to
# `http://pythonhosted.org/flask-mail/#configuring-flask-mail`
MAIL_SERVER = 'smtp.foo.com'
MAIL_USERNAME = 'username'
MAIL_PASSWORD = 'password'
MAIL_DEFAULT_SENDER = 'user@foo.com'
