# -*- coding: UTF-8 -*-
from collections import OrderedDict
import os
import zipfile
import hashlib

from flask import json
from PIL import Image

from yaza import const


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
    top = list(reversed(edges['top']))
    cp_map['top'][top[-1]] = (width - 1, height - 1)
    # note! we omit the top left corner
    for i in xrange(cp_num[0] - 2, 0, -1):
        p = top[int(round(i * step1))]
        cp_map['top'][p] = (int(round(i * step2)), height - 1)

    # left
    step1 = float(len(edges['left'])) / (cp_num[1] - 1)
    step2 = float(height) / (cp_num[1] - 1)
    left = list(reversed(edges['left']))
    # anchor the top left corner
    cp_map['left'][left[-1]] = (0, height - 1)
    # note! we omit the left bottom corner
    for i in xrange(cp_num[1] - 2, 0, -1):
        p = left[int(round(i * step1))]
        cp_map['left'][p] = (0, int(round(i * step2)))

    # bottom
    step1 = float(len(edges['bottom'])) / (cp_num[0] - 1)
    step2 = float(width) / (cp_num[0] - 1)
    bottom = edges['bottom']
    # anchor the left bottom corner
    cp_map['bottom'][bottom[0]] = (0, 0)
    # note! we omit the bottom right corner
    for i in xrange(1, cp_num[0] - 1):
        p = bottom[int(round(i * step1))]
        cp_map['bottom'][p] = (int(round(i * step2)), 0)

    # right
    step1 = float(len(edges['right'])) / (cp_num[1] - 1)
    step2 = float(height) / (cp_num[1] - 1)
    right = edges['right']
    # we anchor the bottom right corner
    cp_map['right'][right[0]] = (width - 1, 0)
    # note! we omit the top left corner
    for i in xrange(1, cp_num[1] - 1):
        p = right[int(round(i * step1))]
        cp_map['right'][p] = (width - 1, int(round(i * step2)))
    return cp_map


def detect_edges(im):
    '''
    Warning !
        in order: top left bottom right

    dectect the edges of an image, in COUNTER-CLOCKWISE, namely, from top to
    left, to bottom, to right, and in 'top' edge, x from high to low;
    in 'left' edge, y from high to low, in 'bottom' edge, x from low to high;
    in 'right' edge, y from low to high
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

    corners = []

    # 先找四个角
    for i in xrange(im.size[0]):
        for j in xrange(im.size[1]):
            if marked_as_corner(pa[(i, j)]):
                corners.append((i, j))
                if len(corners) == 4:
                    break
        if len(corners) == 4:
            break
    # 注意, 我们在这里的假设是:
    corners.sort(key=lambda p: p[1])
    # 上面的一定是右上角和左上角, 而右上角在左上角的右面
    lt, rt = sorted(corners[2:], key=lambda p: p[0])
    # 下面的一定是左下角和右下角, 而左下角在右下角的左面
    lb, rb = sorted(corners[:2], key=lambda p: p[0])

    # top
    edges['top'].append(rt)
    for i in xrange(rt[0] - 1, lt[0], -1):
        for j in xrange(im.size[1] - 1, -1, -1):
            if pa[(i, j)][3] != 0:
                edges['top'].append((i, j))
                break
    # left
    edges['left'].append(lt)
    for j in xrange(lt[1] - 1, lb[1], -1):
        for i in xrange(im.size[0]):
            if pa[(i, j)][3] != 0:
                edges['left'].append((i, j))
                break
    # bottom
    edges['bottom'].append(lb)
    for i in xrange(lb[0] + 1, rb[0]):
        for j in xrange(im.size[1]):
            if pa[(i, j)][3] != 0:
                edges['bottom'].append((i, j))
                break
    # right
    edges['right'].append(rb)
    for j in xrange(rb[1] + 1, rt[1]):
        for i in xrange(im.size[0] - 1, -1, -1):
            if pa[(i, j)][3] != 0:
                edges['right'].append((i, j))
                break

    return edges


def calc_design_region_image(design_region_path):
    from yaza.apis.ocspu import DesignRegionWrapper

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
    return {edge_filename, control_point_filename}


def calc_hsv_values(im):
    pa = im.load()
    hsv_list = []
    for i in xrange(im.size[0]):
        for j in xrange(im.size[1]):
            pixel = pa[(i, j)]
            if pixel[3] != 0:
                hsv_list.append(max(pixel[0], pixel[1], pixel[2]))

    hsv_list.sort()
    return {
        'min': hsv_list[0],
        'median': hsv_list[len(hsv_list) / 2],
        'max': hsv_list[-1]
    }


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

                # design_region_list
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


def create_or_update_spu(spu_dir, start_dir, spu=None):
    from yaza.basemain import app
    from yaza.qiniu_handler import upload_image
    from yaza.utils import do_commit
    from yaza.models import OCSPU, Aspect, DesignRegion, SPU

    def _get_value_from_list(list_, key, condition):
        for item in list_:
            if all(item.get(conditionKey) == conditionVal for conditionKey, conditionVal in
                   condition.iteritems()):
                return item.get(key)
        return None

    def _make_thumbnail(pic_path, start_dir):
        path = ".thumbnail".join(os.path.splitext(pic_path))

        im = Image.open(pic_path)
        im.thumbnail(const.ASPECT_THUMBNAIL_SIZE, Image.ANTIALIAS)
        im.save(path)
        return os.path.relpath(path, start_dir)

    def _create_ocspu(ocspu_dir, cover_file, color, rgb, spu, config):
        cover_path = os.path.relpath(cover_file, start_dir)
        if app.config.get("QINIU_ENABLED"):
            cover_path = upload_image(cover_file, app.config["QINIU_CONF"]["SPU_IMAGE_BUCKET"])

        ocspu = do_commit(OCSPU(spu=spu, cover_path=cover_path, color=color,
                                rgb=rgb))
        aspect_configs = config["aspects"]
        for aspect_config in aspect_configs:
            aspect_dir = os.path.join(ocspu_dir, aspect_config["dir"])
            if os.path.isdir(aspect_dir):
                _create_aspect(aspect_dir, aspect_config["name"], config, ocspu)

    def _create_aspect(aspect_dir, name, config, ocspu):
        for fname in os.listdir(aspect_dir):
            full_path = os.path.join(aspect_dir, fname)
            if os.path.isfile(full_path):
                if fname.split('.')[-1].lower() == 'png':
                    pic_path = os.path.relpath(full_path, start_dir)
                    if app.config.get("QINIU_ENABLED"):
                        pic_path = upload_image(full_path, app.config["QINIU_CONF"]["SPU_IMAGE_BUCKET"])
                        thumbnail_path = pic_path + '?imageView2/0/w/' + str(
                            app.config['QINIU_CONF']['DESIGN_IMAGE_THUMNAIL_SIZE'])
                    else:
                        thumbnail_path = _make_thumbnail(pic_path, start_dir)
                    aspect = do_commit(
                        Aspect(name=name, pic_path=pic_path, ocspu=ocspu, thumbnail_path=thumbnail_path))
                    for fname in os.listdir(aspect_dir):
                        full_path = os.path.join(aspect_dir, fname)
                        if os.path.isdir(full_path):
                            _create_design_region(full_path, config, aspect)
                    return

    def _create_design_region(design_region_dir, config, aspect):
        design_region_configs = config['designRegions']
        for fname in os.listdir(design_region_dir):
            full_path = os.path.join(design_region_dir, fname)
            if os.path.isfile(full_path) and fname.split('.')[-1].lower() == 'png':
                design_region_name = fname.rsplit('.')[0]

                width, height = _get_value_from_list(design_region_configs, "size", {"dir": design_region_name})
                design_region_name = _get_value_from_list(design_region_configs, "name", {"dir": design_region_name})
                pic_path = os.path.relpath(full_path, start_dir)
                if app.config.get("QINIU_ENABLED"):
                    pic_path = upload_image(full_path, app.config["QINIU_CONF"]["SPU_IMAGE_BUCKET"])
                print "progressing image: " + full_path
                edge_file, control_point_file = calc_design_region_image(full_path)
                hsv_values = calc_hsv_values(Image.open(full_path))
                do_commit(DesignRegion(aspect=aspect,
                                       name=design_region_name,
                                       pic_path=pic_path,
                                       width=width,
                                       height=height,
                                       edge_file=edge_file,
                                       control_point_file=control_point_file,
                                       min_hsv_value=hsv_values['min'],
                                       max_hsv_value=hsv_values['max'],
                                       median_hsv_value=hsv_values['median']))

    def _update(spu, **kwargs):
        for key, value in kwargs.iteritems():
            setattr(spu, key, value)

    config = json.load(file(os.path.join(spu_dir, app.config["SPU_CONFIG_FILE"])))
    if spu:
        print "updating spu:" + str(spu.id)
        _update(spu, name=config['name'])
        do_commit(spu)
    else:
        spu = do_commit(SPU(name=config['name']))
        print "created spu:" + str(spu.id)
    for ocspu_config in config["ocspus"]:
        ocspu_dir = os.path.join(spu_dir, ocspu_config["dir"])
        cover_file = os.path.join(ocspu_dir, ocspu_config["cover"])
        color = ocspu_config.get("color")
        rgb = ocspu_config.get('rgb')
        if os.path.isdir(ocspu_dir):
            _create_ocspu(ocspu_dir, cover_file, color, rgb, spu, config)

    return {"spu": spu, "config": config}


def marked_as_corner(pixel):
    return all([pixel[i] == const.CORNER_RGBA[i] for i in (0, 1, 2, 3)])
