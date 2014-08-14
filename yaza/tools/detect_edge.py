#! /usr/bin/env python
import sys

from PIL import Image

from yaza.tools.utils import detect_edges

if __name__ == '__main__':

    if len(sys.argv) != 2:
        print "Usage: detect_edge.py <target>"
        sys.exit(1)

    im = Image.open(sys.argv[1])
    edges, _ = detect_edges(im)

    for border in ['top', 'right', 'bottom', 'left']:
        print '\t'.join(str(p[0]) + ',' + str(p[1]) for p in edges[border])

    pixels = reduce(lambda x, y: x + y, edges.values())
    new_im = Image.new(im.mode, im.size)
    for pixel in pixels:
        new_im.putpixel(pixel, (255, 255, 255))

    new_im.show()
