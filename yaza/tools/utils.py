# -*- coding: UTF-8 -*-
from collections import OrderedDict
import os
import zipfile

from flask import json
from PIL import Image

from yaza.apis.ocspu import DesignRegionWrapper


ARCHIVES = ('zip', )

IMAGES = ('jpg', "jpeg", "png")

CONTROL_POINTS_NUMBER = (4, 4)


def allowed_file(filename, types=ARCHIVES):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in types


def calc_control_points(edges, size, cp_num):
    '''
    get all the contol points map COUNTERCLOCKWISE
    :param edges: the edges of image, namely the output of `detect_edges`
    :param size: the original image(it should be a rectangular) size, it
        is a pair, say (400, 300)

    :param cp_num: control points number, in width and height, it is a
        pair, say (10, 8)
    '''
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
    # anchor the top right corner
    cp_map['top'][edges['top'][-1]] = (width - 1, height - 1)
    # note! we omit the top left corner
    for i in xrange(cp_num[0] - 2, 0, -1):
        p = edges['top'][int(round(i * step1))]
        cp_map['top'][p] = (int(round(i * step2)), height - 1)

    # left
    step1 = float(len(edges['left'])) / (cp_num[1] - 1)
    step2 = float(height) / (cp_num[1] - 1)
    # anchor the top left corner
    cp_map['left'][edges['left'][-1]] = (0, height - 1)
    # note! we omit the left bottom corner
    for i in xrange(cp_num[1] - 2, 0, -1):
        p = edges['left'][int(round(i * step1))]
        cp_map['left'][p] = (0, int(round(i * step2)))

    # bottom
    step1 = float(len(edges['bottom'])) / (cp_num[0] - 1)
    step2 = float(width) / (cp_num[0] - 1)
    # anchor the left bottom corner
    cp_map['bottom'][edges['bottom'][0]] = (0, 0)
    # note! we omit the bottom right corner
    for i in xrange(1, cp_num[0] - 1):
        p = edges['bottom'][int(round(i * step1))]
        cp_map['bottom'][p] = (int(round(i * step2)), 0)

    # right
    step1 = float(len(edges['right'])) / (cp_num[1] - 1)
    step2 = float(height) / (cp_num[1] - 1)
    # we anchor the bottom right corner
    cp_map['right'][edges['right'][0]] = (width - 1, 0)
    # note! we omit the top left corner
    for i in xrange(1, cp_num[1] - 1):
        p = edges['right'][int(round(i * step1))]
        cp_map['right'][p] = (width - 1, int(round(i * step2)))
    return cp_map


def detect_edges(im):
    '''
    dectect the edges of an image
    :param im: an image
    :type im: PIL.Image.Image
    '''
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


def calc_design_region_image(design_region_path):
    im = Image.open(design_region_path)
    edges = detect_edges(im)
    img_extension = os.path.splitext(design_region_path)[-1]
    edge_filename = design_region_path.replace(img_extension, "." + DesignRegionWrapper.DETECT_EDGE_EXTENSION)
    serialize(edges, edge_filename)
    control_point_filename = design_region_path.replace(img_extension,
                                                        "." + DesignRegionWrapper
                                                        .CONTROL_POINT_EXTENSION)
    control_points = calc_control_points(edges, im.size, CONTROL_POINTS_NUMBER)
    serialize(control_points, control_point_filename,
              lambda data: json.dumps(
                  {key: [[list(k), list(v)]] for key, dict_ in data.iteritems() for
                   k, v in dict_.iteritems()}))


def _get_rel_path(file_path, relpath_start):
    rel_path = os.path.relpath(file_path, relpath_start)
    return rel_path


def extract_images(dir_, relpath_start="", front_aspect_name="aa.png"):
    result = {}
    # aspect_list
    for aspect_dir in os.listdir(dir_):
        for name in os.listdir(os.path.join(dir_, aspect_dir)):
            file_path = os.path.join(aspect_dir, name)
            abs_path = os.path.join(dir_, file_path)
            if os.path.isfile(abs_path) and allowed_file(file_path, IMAGES):
                aspect = result.setdefault(aspect_dir, {})
                aspect["file_path"] = _get_rel_path(abs_path, relpath_start)
                if os.path.split(file_path)[-1].lower() == front_aspect_name:
                    aspect["part"] = "front"
                else:
                    aspect["part"] = "other"

            elif os.path.isdir(abs_path):

                #design_region_list
                for root, walk_dirs, files in os.walk(abs_path):
                    for design_file in files:
                        if allowed_file(design_file, IMAGES):
                            design_region_path = os.path.join(root, design_file)
                            calc_design_region_image(design_region_path)

                            aspect = result.setdefault(aspect_dir, {})
                            design_region_list = aspect.setdefault("design_region_list", {})
                            key = os.path.splitext(design_file)[0].lower()
                            design_region_list[key] = _get_rel_path(design_region_path, relpath_start)

    return result


def unzip(source_filename, dest_dir):
    with zipfile.ZipFile(source_filename) as zf:
        zf.extractall(dest_dir)


def serialize(data, filename, encode_func=None):
    if encode_func:
        data = encode_func(data)
    if not isinstance(data, basestring):
        data = json.dumps(data)
    with open(filename, "w") as _file:
        _file.write(data)