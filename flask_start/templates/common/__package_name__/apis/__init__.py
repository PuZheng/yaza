# -*- coding: UTF-8 -*-
import types
from path import path
from .model_wrapper import ModelWrapper, wraps, unwraps

# install all the wrappers in this module
for fname in path(__path__[0]).files("[!_]*.py"):
    fname = fname.basename()[:-len(".py")]
    package = __import__(str("__package_name__.apis." + fname), fromlist=[str(fname)])
    for k, v in package.__dict__.items():
        if isinstance(v, types.TypeType) and \
                issubclass(v, ModelWrapper) and \
                k.endswith("Wrapper"):
            globals()[k] = v
