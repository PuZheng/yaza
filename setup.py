from distutils.core import setup
from setuptools import find_packages
from setuptools.command.test import test as TestCommand
import sys

PACKAGE = "flask_start"
NAME = "flask-start"
DESCRIPTION = ("A django-admin like tool which setup flask project from "
               "predefined templates")
AUTHOR = "xiechao"
AUTHOR_EMAIL = "xiechao06@gmail.com"
URL = "https://github.com/PuZheng/flask-start.git"
DOC = __doc__
VERSION = '0.1'


class PyTest(TestCommand):
    def finalize_options(self):
        TestCommand.finalize_options(self)
        self.test_args = []
        self.test_suite = True

    def run_tests(self):
        import pytest

        errno = pytest.main(self.test_args)
        sys.exit(errno)

setup(
    name=NAME,
    version=VERSION,
    long_description=DOC,
    description=DESCRIPTION,
    author=AUTHOR,
    author_email=AUTHOR_EMAIL,
    license="MIT",
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    scripts=['flask-start'],
    tests_require=['pytest'],
    cmdclass={'test': PyTest},
    install_requires=[
        'plumbum',
        'autopep8'
    ],
    classifiers=[
        'Environment :: Web Environment',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: BSD License',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Topic :: Internet :: WWW/HTTP :: Dynamic Content',
        'Topic :: Software Development :: Libraries'
    ]
)
