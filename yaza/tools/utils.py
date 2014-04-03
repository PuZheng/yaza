# -*- coding: UTF-8 -*-
from collections import OrderedDict

def calc_control_points(edges, size, cp_num):
    width, height = size
    cp_map = {
        'top': OrderedDict(),
        'right': OrderedDict(),
        'bottom': OrderedDict(),
        'left': OrderedDict(),
    }
    # top
    step1 = float(len(edges['top'])) / (cp_num[0] - 1)
    step2 = float(width) / (cp_num[0] - 1)
    for i in xrange(cp_num[0] - 1):
        p = edges['top'][int(round(i * step1))]
        cp_map['top'][p] = (int(round(i * step2)), height - 1)
    cp_map['top'][edges['top'][-1]] = (width - 1, height - 1)

    # bottom
    step1 = float(len(edges['bottom'])) / (cp_num[0] - 1)
    for i in xrange(cp_num[0] - 1):
        p = edges['bottom'][int(round(i * step1))]
        cp_map['bottom'][p] = (int(round(i * step2)), 0)
    cp_map['bottom'][edges['bottom'][-1]] = (width - 1, 0)

    # left
    step1 = float(len(edges['left'])) / (cp_num[1] - 1)
    step2 = float(height) / (cp_num[1] - 1)
    for i in xrange(cp_num[1] - 1):
        p = edges['left'][int(round(i * step1))]
        cp_map['left'][p] = (0, int(round(i * step2)))
    cp_map['left'][edges['left'][-1]] = (0, height - 1)

    # right
    step1 = float(len(edges['right'])) / (cp_num[1] - 1)
    for i in xrange(cp_num[1] - 1):
        p = edges['right'][int(round(i * step1))]
        cp_map['right'][p] = (width - 1, int(round(i * step2)))
    cp_map['right'][edges['right'][-1]] = (width - 1, height - 1)
    return cp_map


def detect_edges(im):
    pa = im.load()
    edges = {
        'top': [],
        'right': [],
        'bottom': [],
        'left': []
    }

    lt_met = False  # left top corner
    rt_met = False

    for i in xrange(im.size[0]):
        for j in xrange(im.size[1] - 1, -1, -1):
            pixel = pa[(i, j)]
            if pixel[3] != 0:
                if pixel[0] == 255:
                    edges['top'].append((i, j))
                    if not lt_met:
                        lt_met = True
                    else:
                        rt_met = True
                else:
                    if lt_met:
                        edges['top'].append((i, j))
                break
        if rt_met:
            break


    lb_met = False
    rb_met = False
    for i in xrange(im.size[0]):
        for j in xrange(im.size[1]):
            pixel = pa[(i, j)]
            if pixel[3] != 0:
                if pixel[0] == 255:
                    edges['bottom'].append((i, j))
                    if not lb_met:
                        lb_met = True
                    else:
                        rb_met = True
                else:
                    if lb_met:
                        edges['bottom'].append((i, j))
                break
        if rb_met:
            break

    lb_met = False
    lt_met = False
    for i in xrange(im.size[1]):
        for j in xrange(im.size[0]):
            pixel = pa[(j, i)]
            if pixel[3] != 0:
                if pixel[0] == 255:
                    edges['left'].append((j, i))
                    if not lb_met:
                        lb_met = True
                    else:
                        lt_met = True
                else:
                    if lb_met:
                        edges['left'].append((j, i))
                break
        if lt_met:
            break

    rb_met = False
    rt_met = False
    for i in xrange(im.size[1]):
        for j in xrange(im.size[0] - 1, -1, -1):
            pixel = pa[(j, i)]
            if pixel[3] != 0:
                if pixel[0] == 255:
                    edges['right'].append((j, i))
                    if not rb_met:
                        rb_met = True
                    else:
                        rt_met = True
                else:
                    if rb_met:
                        edges['right'].append((j, i))
                break
        if rt_met:
            break
    return edges
