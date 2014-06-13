#! /usr/bin/env python

import sys
from PIL import Image, ImageOps

import yaza.basemain
from yaza.tools.utils import create_shadow_im

if __name__ == '__main__':

    im = Image.open(sys.argv[1])
    black_dest_im, white_dest_im = create_shadow_im(im, sys.argv[2])
    if len(sys.argv) == 5:
        black_dest_im.save(sys.argv[3])
        white_dest_im.save(sys.argv[4])
    else:
        black_dest_im.show()
        white_dest_im.show()
