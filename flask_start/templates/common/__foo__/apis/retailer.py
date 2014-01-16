# -*- coding: UTF-8 -*-
import posixpath
import random
from flask import url_for

from genuine_ap import models
from genuine_ap.apis import wraps, ModelWrapper


def find_retailers(longitude, latitude, max_distance=1500):
    if not (longitude and latitude):
        return (), ()
    #TODO a dumb implementation
    retailers = models.Retailer.query.all()
    distance_list = []

    for retailer in retailers:
        offset = random.randrange(-10, stop=10) * 0.0001
        retailer.longitude = longitude + offset
        retailer.latitude = latitude + offset
        distance_list.append(int(abs(offset * 110000)))

    return wraps(retailers), distance_list


def compose_spu_id_2_distance(longitude, latitude, max_distance=1500):

    retailers, distance_list = find_retailers(longitude, latitude,
                                              max_distance=max_distance)
    ret = {}
    for retailer, distance in zip(retailers, distance_list):
        for spu in retailer.spu_list:
            ret[spu.id] = distance
    return ret


class RetailerWrapper(ModelWrapper):

    def as_dict(self):

        return {
            'id': self.id,
            'name': self.name,
            'desc': self.brief,
            'rating': self.rating,
            'longitude': self.longitude,
            'latitude': self.latitude,
            'logo': self.logo,
            'icon': self.icon,
            'address': self.address,
        }

    @property
    def logo(self):
        if posixpath.exists(posixpath.join('static', 'retailer_pics',
                                           str(self.id) + '_logo.jpg')):
            return url_for('static',
                           filename='retailer_pics/' + str(self.id) +
                           '_logo.jpg')
        return ''

    @property
    def spu_cnt(self):
        return len(self.spu_list)
