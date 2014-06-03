#-*- coding:utf-8 -*-
import os
import base64
import sys

from pysvg import parser, structure
from PIL import Image

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
        try:
            design_image_file = image.data("design-image-file")
            design_image_file = design_image_file.rsplit('/')[-1]
            design_image_file = design_image_file.replace("%5C", "/")

            im = Image.open(os.path.join(image_folder, design_image_file))

            rotate = -float(image.data("rotation") or 0)

            new_im = im.resize((int(float(image.get_width())), int(float(image.get_height()))), Image.ANTIALIAS).rotate(
                rotate, Image.BICUBIC)

            tmp_file = os.path.join(image_folder, ".tmp".join(os.path.splitext(design_image_file)))
            new_im.save(tmp_file)

            with open(tmp_file, "rb") as f:
                content = f.read()
            # content = file(os.path.join(image_folder, design_image_file)).read()
            image.set_xlink_href("data:image/png;base64," + base64.b64encode(content))
        except AttributeError:
            pass
        svg_file.save(".hd".join(os.path.splitext(file_)))


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print "\nUsage: convert-design.py <design file> <hd image folder>\n\n"
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2])
