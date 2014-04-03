#! /usr/bin/env python
import sys
from getopt import getopt

from yaza.tools.utils import calc_control_points

if __name__ == "__main__":

    opts, _ = getopt(sys.argv[1:], "n:s:h")

    for o, v in opts:

        if o == '-n':
            cp_num = v
            if 'x' in cp_num:
                cp_num = (int(i) for i in cp_num.split('x'))
            else:
                cp_num = (int(cp_num), int(cp_num))
        elif o == '-s':
            width, height = (int(i) for i in v.split('x'))
        elif o == '-h':
            print __doc__
            sys.exit(1)
        else:
            print "unknown option: " + o
            sys.exit(1)
    try:
        cp_num
        width
        height
    except NameError:
        print __doc__
        sys.exit(1)

    edges = {}
    for border in ['top', 'right', 'bottom', 'left']:
        l = sys.stdin.readline().strip()
        edges[border] = [tuple(int(j) for j in i.split(',')) for i in
                         l.split()]

    cp_map = calc_control_points(edges, (width, height), cp_num)
    for border in ['top', 'right', 'bottom', 'left']:
        print '\t'.join(','.join(map(str, k)) + ':' + ','.join(map(str, v))
                        for k, v in cp_map[border].items())
