#-*- coding:utf-8 -*-
import os
import base64

from pysvg import parser, structure
from PIL import Image

from yaza import models


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
        design_image = models.DesignImage.query.get(image.data("design-image-id"))
        im = Image.open(os.path.join(image_folder, design_image.pic_path))

        rotate = 0
        transforms = image.get_transform()
        if transforms:
            rotate = float(transforms[len("rotate("):-1].split()[0])

        new_im = im.resize((int(float(image.get_width())), int(float(image.get_height()))), Image.ANTIALIAS).rotate(
            rotate, Image.BICUBIC)

        temp_image_name = file_ + ".tmp" + os.path.splitext(design_image.pic_path)[-1]
        new_im.save(temp_image_name)
        with open(temp_image_name, "rb") as image_file:
            image.set_xlink_href("data:image/png;base64," + base64.b64encode(image_file.read()))
        os.unlink(temp_image_name)
        svg_file.save(".new".join(os.path.splitext(file_)))


if __name__ == "__main__":
    f = r"C:\Users\Young\Downloads\胸腹部.svg"
    convert(f.decode("utf-8"), r"C:\Work\Project\yaza\yaza\static\uploads")
