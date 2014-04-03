#! /usr/bin/env python
import sys
from getopt import getopt
import itertools
from math import sqrt, hypot

from PIL import Image
from yaza.tools.utils import calc_control_points, detect_edges


def point_series(im, edges):
    left_right_edge = set(itertools.chain(edges['left'], edges['right']))
    data = im.load()
    for i in xrange(im.size[0]):
        met_edge = False
        for j in xrange(im.size[1]):
            if data[(i, j)][3] != 0:
                if not met_edge:
                    met_edge = True
                else:
                    if j + 1 < im.size[1] and data[(i, j + 1)][3] != 0 and (i, j) not in left_right_edge:
                        yield (i, j)


def get_cos(a, b, c):
    return (a * a + c * c - b * b) / (2 * a * c)


def mvc(p, cp_map):
    x, y = 0.0, 0.0

    cp_list = []
    cp_list.extend(reversed(cp_map['top'].items()))
    cp_list.extend(reversed(cp_map['left'].items()))
    cp_list.extend(cp_map['bottom'].items())
    cp_list.extend(cp_map['right'].items())

    weights = []
    for i in xrange(len(cp_list)):
        cp0 = cp_list[i - 1][0]
        cp1 = cp_list[i][0]
        cp2 = cp_list[(i + 1) % len(cp_list)][0]
        cos0 = get_cos(hypot(cp0[0] - p[0], cp0[1] - p[1]),
                       hypot(cp0[0] - cp1[0], cp0[1] - cp1[1]),
                       hypot(cp1[0] - p[0], cp1[1] - p[1]))
        cos1 = get_cos(hypot(cp1[0] - p[0], cp1[1] - p[1]),
                       hypot(cp2[0] - cp1[0], cp2[1] - cp1[1]),
                       hypot(cp2[0] - p[0], cp2[1] - p[1]))
        if cos1 <= -1 or cos0 <= -1:
            weights.append(0)
            continue
        tan0 = sqrt(max(0, 1.0 - cos0) / (1 + cos0))
        tan1 = sqrt(max(0, 1.0 - cos1) / (1 + cos1))
        w = (tan0 + tan1) / hypot(cp1[0] - p[0], cp1[1] - p[1])
        weights.append(w)

    weights_sum = sum(weights)
    for i in xrange(len(cp_list)):
        x += weights[i] * cp_list[i][1][0]
        y += weights[i] * cp_list[i][1][1]
    return round(x / weights_sum), round(y / weights_sum)

if __name__ == '__main__':

    opts, _ = getopt(sys.argv[1:], 'i:o:n:h')

    for o, v in opts:
        if o == '-i':
            src_file = v
        elif o == '-o':
            dest_file = v
        elif o == '-n':
            cp_num = v
            if 'x' in cp_num:
                cp_num = (int(i) for i in cp_num.split('x'))
            else:
                cp_num = (int(cp_num), int(cp_num))
        elif o == '-h':
            print __doc__
            sys.exit(1)
        else:
            print 'unknown option: ' + o
            print __doc__
            sys.exit(1)

    try:
        src_file
    except NameError:
        print __doc__
        sys.exit(1)

    src_im = Image.open(src_file)
    src_data = src_im.load()
    dest_im = Image.open(dest_file)
    projection_im = Image.new('RGBA', dest_im.size, (0, 0, 0, 0))
    projection_data = projection_im.load()
    edges = detect_edges(dest_im)
    cp_map = calc_control_points(edges, src_im.size, cp_num)

    for p in point_series(dest_im, edges):
        p1 = mvc(p, cp_map)
        rgba = src_data[p1]
        projection_data[p] = rgba

    projection_im.show()
    projection_im.save('temp.png')
