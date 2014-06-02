#-*- coding:utf-8 -*-
import os
import base64
import sys

from pysvg import parser, structure

from yaza.basemain import app


def convert(file_, image_folder):
    def setAttributes(attrs, obj):
        for attr in attrs.keys():
            if hasattr(obj, parser.calculateMethodName(attr)):
                eval('obj.' + parser.calculateMethodName(attr))(attrs[attr].value)
            else:
                if not hasattr(obj, "_data"):
                    obj._data = {}
                obj._data[attr] = attrs[attr].value
                if not hasattr(obj, "data"):
                    obj.data = lambda key: obj._data.get("data-" + key)

    parser.setAttributes = setAttributes

    svg_file = parser.parse(file_)
    for image in svg_file.getElementsByType(structure.Image):
        design_image_file = image.data("design-image-file")
        content = file(os.path.join(image_folder, design_image_file)).read()
        image.set_xlink_href("data:image/png;base64," +
                             base64.b64encode(content))
        svg_file.save(".hd".join(os.path.splitext(file_)))


if __name__ == "__main__":
    convert(sys.argv[1], sys.argv[2])
