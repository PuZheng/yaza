# -*- coding: UTF-8 -*-
import hashlib
import os
import types
import string
import random
from .apis import ModelWrapper, wraps


def do_commit(obj, action="add"):
    from .database import db
    if action == "add":
        if isinstance(obj, types.ListType) or \
           isinstance(obj, types.TupleType):
            db.session.add_all(obj)
        else:
            db.session.add(obj)
    elif action == "delete":
        db.session.delete(obj)
    db.session.commit()
    return obj


def as_dict(fields, d):
    items = []
    for field in fields:
        if isinstance(field, types.StringType):
            items.append((field, d.get(field)))
        elif isinstance(field, types.TupleType):
            items.append((field[0], d.get(field[1])))
    return dict(items)


def assert_dir(dir_path):
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)


def get_or_404(cls, id_):
    from .database import db
    assert issubclass(cls, db.Model) or issubclass(cls, ModelWrapper)
    return wraps(cls.query.get_or_404(id_))


def random_str(size=6, chars=string.ascii_uppercase + string.digits):
    random.seed = (os.urandom(1024))
    return ''.join(random.choice(chars) for x in range(size))


def md5sum(file_, block_size=65536):
    hash_ = hashlib.md5()
    with open(file_, "rb") as f:
        for block in iter(lambda: f.read(block_size), ""):
            hash_.update(block)
    return hash_.hexdigest()