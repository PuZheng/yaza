# -*- coding: UTF-8 -*-
from collections import OrderedDict
import os
import zipfile
from binascii import b2a_base64
from StringIO import StringIO
import math

from flask import json
from PIL import Image

from yaza.basemain import app
from yaza import const
from yaza.qiniu_handler import upload_str
from yaza.apis.ocspu import DesignRegionWrapper
from yaza.utils import do_commit
from yaza.models import OCSPU, Aspect, DesignRegion, SPU


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


def _adjust_vertex(point, pa):
    if pa[tuple(point)][3]:  # if this point is not transparent, then just return
        return point
    range = 1
    hit = []
    x, y = point
    while not hit:
        for i in xrange(x - range, x + range):
            # top
            if pa[(i, y + range)][3]:
                hit.append(((i, y + range), math.sqrt((i - x) * (i - x) +
                                                      range * range)))
            # bottom
            if pa[(i, y - range)][3]:
                hit.append(((i, y - range), math.sqrt((i - x) * (i - x) +
                                                      range * range)))

        for j in xrange(y - range, y + range):
            # right
            if pa[(i + range, j)][3]:
                hit.append(((i + range, j), math.sqrt(range * range +
                                                      (j - y) * (j - y))))
            # left
            if pa[(i - range, j)][3]:
                hit.append(((i - range, j), math.sqrt(range * range +
                                                      (j - y) * (j - y))))

        range += 1

    return sorted(hit, key=lambda v: v[1])[0]




def detect_edges(im, corner_dict=None):
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

    if not corner_dict:
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
    else:
        lt = _adjust_vertex(corner_dict['lt'], pa)
        rt = _adjust_vertex(corner_dict['rt'], pa)
        lb = _adjust_vertex(corner_dict['lb'], pa)
        rb = _adjust_vertex(corner_dict['rb'], pa)

    # top
    edges['top'].append(rt)
    last_point = rt
    for i in xrange(rt[0] - 1, lt[0], -1):
        for j in xrange(im.size[1] - 1, -1, -1):
            if pa[(i, j)][3] != 0:
                # 一定保证闭合, 下同
                if abs(j - last_point[1]) > 1:
                    if j > last_point[1]:
                        min_ = last_point[1] + 1
                        max_ = j
                    else:
                        min_ = j + 1
                        max_ = last_point[1]
                    for k in xrange(min_, max_):
                        edges['top'].append((last_point[0], k))
                edges['top'].append((i, j))
                last_point = (i, j)
                break
        else:
            # 一定保证闭合，下同
            edges['top'].append((i, last_point[1]))

    # left
        # 保证顶点处的闭合， 下同
    if abs(lt[1] - last_point[1]) > 1:
        if lt[1] > last_point[1]:
            min_ = last_point[1] + 1
            max_ = lt[1] + 1
        else:
            min_ = lt[1] + 1
            max_ = last_point[1]
        for k in xrange(min_, max_):
            edges['top'].append((last_point[0], k))
    edges['left'].append(lt)
    last_point = lt
    for j in xrange(lt[1] - 1, lb[1], -1):
        for i in xrange(im.size[0]):
            if pa[(i, j)][3] != 0:
                if abs(i - last_point[0]) > 1:
                    if i > last_point[0]:
                        min_ = last_point[0] + 1
                        max_ = i
                    else:
                        min_ = i + 1
                        max_ = last_point[0]
                    for k in xrange(min_, max_):
                        edges['left'].append((k, last_point[1]))
                edges['left'].append((i, j))
                last_point = (i, j)
                break
        else:
            edges['left'].append((last_point[0], j))

    # bottom
    if abs(lb[0] - last_point[0]) > 1:
        if lb[0] > last_point[0]:
            min_ = last_point[0] + 1
            max_ = lb[0]
        else:
            min_ = lb[0] + 1
            max_ = last_point[0]
        for k in xrange(min_, max_):
            edges['left'].append((k, last_point[1]))
    edges['bottom'].append(lb)
    last_point = lb
    for i in xrange(lb[0] + 1, rb[0]):
        for j in xrange(im.size[1]):
            if pa[(i, j)][3] != 0:
                if abs(j - last_point[1]) > 1:
                    if j > last_point[1]:
                        min_ = last_point[1] + 1
                        max_ = j
                    else:
                        min_ = j + 1
                        max_ = last_point[1]
                    for k in xrange(min_, max_):
                        edges['bottom'].append((last_point[0], k))
                edges['bottom'].append((i, j))
                last_point = (i, j)
                break
        else:
            edges['bottom'].append((i, last_point[1]))

    # right
    if abs(rb[1] - last_point[1]) > 1:
        if rb[1] > last_point[1]:
            min_ = last_point[1] + 1
            max_ = rb[1]
        else:
            min_ = rb[1]
            max_ = last_point[1]
        for k in xrange(min_, max_):
            edges['bottom'].append((last_point[0], k))
    edges['right'].append(rb)
    last_point = rb
    for j in xrange(rb[1] + 1, rt[1]):
        for i in xrange(im.size[0] - 1, -1, -1):
            if pa[(i, j)][3] != 0:
                if abs(i - last_point[0]) > 1:
                    if i > last_point[0]:
                        min_ = last_point[0] + 1
                        max_ = i
                    else:
                        min_ = i + 1
                        max_ = last_point[0]
                    for k in xrange(min_, max_):
                        edges['right'].append((k, last_point[1]))
                edges['right'].append((i, j))
                last_point = (i, j)
                break
        else:
            edges['right'].append((last_point[0], j))

    if abs(rt[0] - last_point[0]) > 1:
        if rt[0] > last_point[0]:
            min_ = last_point[0] + 1
            max_ = rt[0]
        else:
            min_ = rt[0] + 1
            max_ = last_point[0]
        for k in xrange(min_, max_):
            edges['top'].append((k, last_point[1]))

    return edges, {
        'lt': lt,
        'rt': rt,
        'lb': lb,
        'rb': rb
    }


def calc_design_region_image(design_region_path):

    im = Image.open(design_region_path)
    edges, vertex = detect_edges(im)
    img_extension = os.path.splitext(design_region_path)[-1]
    edge_filename = design_region_path.replace(
        img_extension,
        "." + DesignRegionWrapper.DETECT_EDGE_EXTENSION)
    with open(edge_filename, 'w') as file_:
        file_.write(json.dumps(edges))
    control_point_filename = design_region_path.replace(
        img_extension,
        "." + DesignRegionWrapper.CONTROL_POINT_EXTENSION)
    control_points = calc_control_points(edges, im.size, CONTROL_POINTS_NUMBER)
    serialize(control_points, control_point_filename,
              lambda data: json.dumps(
                  {key: [[list(k), list(v)]] for key, dict_ in data.iteritems()
                   for k, v in dict_.iteritems()}))
    return edge_filename, control_point_filename, vertex


def _get_rel_path(file_path, relpath_start):
    rel_path = os.path.relpath(file_path, relpath_start)
    return rel_path


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

    def _get_value_from_list(list_, key, condition):
        for item in list_:
            if all(item.get(conditionKey) == conditionVal for conditionKey,
                   conditionVal in
                   condition.iteritems()):
                return item.get(key)
        return None

    def _create_ocspu(ocspu_dir, cover_full_path, color, rgb, spu, config):
        cover_path = os.path.relpath(cover_full_path, start_dir)
        upload_str(cover_path,
                   open(cover_full_path, 'rb').read(),
                   app.config["QINIU_CONF"]["SPU_IMAGE_BUCKET"],
                   True, 'image/png')

        ocspu = do_commit(OCSPU(spu=spu, cover_path=cover_path, color=color,
                                rgb=rgb))
        aspect_configs = config["aspects"]
        for aspect_config in aspect_configs:
            aspect_dir = os.path.join(ocspu_dir, aspect_config["dir"])
            if os.path.isdir(aspect_dir):
                _create_aspect(aspect_dir, aspect_config["name"], config,
                               ocspu)

    def _create_aspect(aspect_dir, name, config, ocspu):
        for fname in os.listdir(aspect_dir):
            full_path = os.path.join(aspect_dir, fname)
            if os.path.isfile(full_path):
                if fname.split('.')[-1].lower() == 'png':
                    pic_path = os.path.relpath(full_path, start_dir)
                    im = Image.open(full_path)
                    width, height = im.size
                    bucket = app.config["QINIU_CONF"]["SPU_IMAGE_BUCKET"]
                    upload_str(pic_path, open(full_path, 'rb').read(),
                               bucket, True, 'image/png')
                    duri_path = pic_path.rstrip('.png') + '.duri'
                    md_size = app.config['QINIU_CONF']['ASPECT_MD_SIZE']
                    if height > width:
                        im.resize((md_size, md_size * width / height))
                    else:
                        im.resize((md_size * height / width, md_size))
                    si = StringIO()
                    im.save(si, 'png')
                    upload_str(duri_path,
                               'data:image/png;base64,' +
                               b2a_base64(si.getvalue()).strip(),
                               bucket, True, 'text/plain')
                    aspect = do_commit(
                        Aspect(name=name, pic_path=pic_path, ocspu=ocspu,
                               width=width, height=height))
                    for fname in os.listdir(aspect_dir):
                        full_path = os.path.join(aspect_dir, fname)
                        if os.path.isdir(full_path):
                            _create_design_region(full_path, config, aspect)
                    return

    def _create_design_region(design_region_dir, config, aspect):
        design_region_configs = config['designRegions']
        for fname in os.listdir(design_region_dir):
            full_path = os.path.join(design_region_dir, fname)
            if os.path.isfile(full_path) and \
               fname.split('.')[-1].lower() == 'png':
                print "progressing image: " + full_path
                design_region_name = fname.rsplit('.')[0]

                width, height = _get_value_from_list(
                    design_region_configs,
                    "size",
                    {
                        "dir": design_region_name
                    })
                design_region_name = _get_value_from_list(
                    design_region_configs, "name",
                    {"dir": design_region_name})
                pic_path = os.path.relpath(full_path, start_dir)
                bucket = app.config["QINIU_CONF"]["SPU_IMAGE_BUCKET"]
                upload_str(pic_path, file(full_path, 'rb').read(),
                           bucket, True, 'image/png')
                edge_full_path, control_point_file, vertex = \
                    calc_design_region_image(full_path)
                edge_path = os.path.relpath(edge_full_path, start_dir)
                upload_str(edge_path,
                           open(edge_full_path, 'rb').read(),
                           app.config["QINIU_CONF"]["SPU_IMAGE_BUCKET"],
                           True,
                           mime_type='application/json')
                black_shadow_im, white_shadow_im = create_shadow_im(
                    Image.open(full_path), aspect.ocspu.rgb,
                    app.config['BLACK_ALPHA_THRESHOLD'],
                    app.config['WHITE_ALPHA_THRESHOLD'], vertex.values())
                black_shadow_full_path = os.path.join(design_region_dir,
                                                      fname +
                                                      '.black_shadow.png')
                white_shadow_full_path = os.path.join(design_region_dir,
                                                      fname +
                                                      '.white_shadow.png')
                black_shadow_im.save(black_shadow_full_path)
                white_shadow_im.save(white_shadow_full_path)
                black_shadow_path = os.path.relpath(black_shadow_full_path,
                                                    start_dir)
                white_shadow_path = os.path.relpath(white_shadow_full_path,
                                                    start_dir)
                bucket = app.config["QINIU_CONF"]["SPU_IMAGE_BUCKET"]
                upload_str(black_shadow_path,
                           open(black_shadow_full_path, 'rb').read(),
                           bucket, True, 'image/png')
                upload_str(white_shadow_path,
                           open(white_shadow_full_path, 'rb').read(),
                           bucket, True, 'image/png')
                black_shadow_duri_path = black_shadow_path.rstrip('.png') + \
                    '.duri'
                white_shadow_duri_path = white_shadow_path.rstrip('.png') + \
                    '.duri'
                upload_str(black_shadow_duri_path,
                           'data:image/png;base64,' +
                           b2a_base64(
                               open(black_shadow_full_path, 'rb')
                               .read()).strip(),
                           bucket, True, 'text/plain')
                upload_str(white_shadow_duri_path,
                           'data:image/png;base64,' +
                           b2a_base64(
                               open(white_shadow_full_path, 'rb')
                               .read()).strip(),
                           bucket, True, 'text/plain')
                do_commit(DesignRegion(aspect=aspect,
                                       name=design_region_name,
                                       pic_path=pic_path,
                                       width=width,
                                       height=height,
                                       edge_path=edge_path,
                                       control_point_file=control_point_file,
                                       black_shadow_path=black_shadow_path,
                                       white_shadow_path=white_shadow_path))

    def _update(spu, **kwargs):
        for key, value in kwargs.iteritems():
            setattr(spu, key, value)

    config = json.load(file(os.path.join(spu_dir,
                                         app.config["SPU_CONFIG_FILE"])))
    if spu:
        print "updating spu:" + str(spu.id)
        _update(spu, name=config['name'])
        do_commit(spu)
    else:
        spu = do_commit(SPU(name=config['name'], published=True))
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


def create_shadow_im(im, color, black_alpha_threshold=80,
                     white_alpha_threshold=108, vertex=[]):
    """
    一定不能考虑vertex, 因为顶点是人工标记出来的， 是噪音
    """
    im = im.convert('LA')
    pa = im.load()

    black_dest_im = Image.new('RGBA', im.size, (0, 0, 0, 0))
    black_dest_pa = black_dest_im.load()
    white_dest_im = Image.new('RGBA', im.size, (0, 0, 0, 0))
    white_dest_pa = white_dest_im.load()
    max_black_alpha = 0
    min_black_alpha = 255
    max_white_alpha = 0
    min_white_alpha = 255
    black_alpha_matrix = [[0 for j in xrange(im.size[1])] for i in
                          xrange(im.size[0])]
    white_alpha_matrix = [[0 for j in xrange(im.size[1])] for i in
                          xrange(im.size[0])]
    for i in xrange(im.size[0]):
        for j in xrange(im.size[1]):
            if pa[(i, j)][1] == 255 and (i, j) not in vertex:
                black_alpha_matrix[i][j] = 255 - pa[(i, j)][0]
                white_alpha_matrix[i][j] = pa[(i, j)][0]

                if black_alpha_matrix[i][j] > max_black_alpha:
                    max_black_alpha = black_alpha_matrix[i][j]
                if black_alpha_matrix[i][j] < min_black_alpha:
                    min_black_alpha = black_alpha_matrix[i][j]

                if white_alpha_matrix[i][j] > max_white_alpha:
                    max_white_alpha = white_alpha_matrix[i][j]
                if white_alpha_matrix[i][j] < min_white_alpha:
                    min_white_alpha = white_alpha_matrix[i][j]

    for i in xrange(im.size[0]):
        for j in xrange(im.size[1]):
            if black_alpha_matrix[i][j]:
                alpha = float(black_alpha_matrix[i][j] - min_black_alpha) / \
                    (max_black_alpha - min_black_alpha)
                alpha = pow(alpha, 3) * black_alpha_threshold
                black_dest_pa[(i, j)] = (0, 0, 0, int(alpha))
            if white_alpha_matrix[i][j]:
                alpha = float(white_alpha_matrix[i][j] - min_white_alpha) / \
                    (max_white_alpha - min_white_alpha)
                alpha = pow(alpha, 3) * white_alpha_threshold
                white_dest_pa[(i, j)] = (255, 255, 255, int(alpha))

    return black_dest_im, white_dest_im
