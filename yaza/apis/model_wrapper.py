# -*- coding: UTF-8 -*-
import types
import inspect
import traceback


class _MyAttributeError(Exception):

    pass


def convert_attribute_error(f):

    def f_(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except AttributeError, e:
            print "~" * 78
            traceback.print_exc()
            print "~" * 78
            raise _MyAttributeError(e)

    return f_


class _FGet(object):

    def __init__(self, attr):
        self.attr = attr

    def __call__(self, wrapper):
        return wraps(convert_attribute_error(self.attr.fget)(wrapper))


def wraps(obj):
    if isinstance(obj, types.ListType) or isinstance(obj, types.TupleType):
        return obj.__class__(wraps(obj_) for obj_ in obj)
    if hasattr(obj.__class__, '_sa_class_manager'):
        try:
            return _wrappers[obj.__class__.__name__ + "Wrapper"](obj)
        except KeyError:
            return obj
    return obj


def unwraps(obj):
    if isinstance(obj, types.ListType) or isinstance(obj, types.TupleType):
        return obj.__class__(unwraps(obj_) for obj_ in obj)
    if isinstance(obj, ModelWrapper):
        return obj.obj
    return obj

_wrappers = {}


class ModelWrapper(object):

    class __metaclass__(type):

        def __init__(cls, name, bases, nmspc):
            type.__init__(cls, name, bases, nmspc)
            # register wrappers
            _wrappers[cls.__name__] = cls
            # decorate wrapper's method:
            #
            #   * convert result object(s) to wrapper(s)
            #   * convert attribute error, otherwise the underlying object
            #     will be searched, and finally make bizzare result
            for name, attr in cls.__dict__.items():
                if isinstance(attr, property) and name not in {'obj'}:
                    setattr(cls, name, property(fget=_FGet(attr),
                                                fset=attr.fset,
                                                fdel=attr.fdel))
                elif inspect.ismethod(attr) and attr not in {'__getattr__',
                                                             '__setattr__',
                                                             '__unicode__'}:
                    old = convert_attribute_error(getattr(cls, name))
                    setattr(cls, name, lambda wrapper, *args,
                            **kwargs: wraps(old(wrapper, *args, **kwargs)))

    def __init__(self, obj):
        self.__obj = obj

    @property
    def obj(self):
        return self.__obj

    def __getattr__(self, name):
        attr = getattr(self.__obj, name)
        if isinstance(attr, types.ListType) or isinstance(attr,
                                                          types.TupleType):
            return type(attr)(wraps(i) for i in attr)
        return wraps(attr)

    def __setattr__(self, key, value):
        # TODO when only key is defined in wrapped object
        if key != '_ModelWrapper__obj':
            self.__obj.__setattr__(key, value)
        else:
            self.__dict__[key] = value

    def __unicode__(self):
        return unicode(self.__obj)

    def __dir__(self):
        return self.__obj.__dict__.keys()
