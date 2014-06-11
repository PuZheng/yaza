#! /usr/bin/env python

import sys
from PIL import Image, ImageOps

from yaza.tools.utils import create_shadow_im
if __name__ == '__main__':

    im = Image.open(sys.argv[1])
    dest_im = create_shadow_im(im)
    if len(sys.argv) == 3:
        dest_im.save(sys.argv[2])
    else:
        dest_im.show()
