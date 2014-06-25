# -*- coding:utf-8 -*-,
import random
import colorsys
from collections import namedtuple, OrderedDict
from math import sqrt

from PIL import Image

__all__ = ["contrast_color", "dominant_colorz"]

# coords: (r, g, b), ct: count
Point = namedtuple('Point', ('coords', 'n', 'ct'))
Cluster = namedtuple('Cluster', ('points', 'center', 'n'))
Color = namedtuple("Color", ("red", "green", "blue"))

rtoh = lambda rgb: ('#%s' % ''.join(('%02x' % p for p in rgb))).upper()


def contrast_color(base_color):
    base_color = _parse2color(base_color)
    # 从web safe colors 里面选
    iterator = safe_colors.itervalues() if base_color.red > 128 else reversed(safe_colors.values())
    for color in iterator:
        color = _parse2color(color)
        if _is_readability(base_color, color):
            return rtoh([color.red, color.green, color.blue])
    else:
        for red in xrange(0, 256):
            for green in xrange(0, 256):
                for blue in xrange(0, 256):
                    color = Color(red=red, green=green, blue=blue)
                    if _is_readability(base_color, color):
                        return rtoh([color.red, color.green, color.blue])

    return rtoh([255 - base_color.red, 255 - base_color.green, 255 - base_color.blue])


def darker_color(base_color, darker_percent=25):
    base_color = _parse2color(base_color)
    hsv = colorsys.rgb_to_hsv(base_color.red / 255.0, base_color.green / 255.0, base_color.blue / 255.0)
    _darker_color = colorsys.hsv_to_rgb(hsv[0], hsv[1], max(0, hsv[2] - darker_percent / 100.0))
    return rtoh(map(lambda x: x * 255, _darker_color))


def dominant_colorz(filename, n=3):
    img = Image.open(filename)
    img.thumbnail((200, 200))

    points = _get_points(img)
    clusters = _kmeans(points, n, 1)
    rgbs = [map(int, c.center.coords) for c in clusters]
    return map(rtoh, rgbs)


def _is_readability(color1, color2):
    return color_diff(color1, color2) > 500 and \
           brightness_diff(color1, color2) > 125 and \
           luminosity_diff(color1, color2) > 5


def color_diff(color1, color2):
    # value higher than 500 is recommended for good readability
    return abs(color1.red - color2.red) + abs(color1.green - color2.green) + abs(color1.blue - color2.blue)


def brightness_diff(color1, color2):
    # return value of more than 125 is recommended
    def brightness(color):
        return (299 * color.red + 587 * color.green + 114 * color.blue) / 1000

    return abs(brightness(color1) - brightness(color2))


def luminosity_diff(color1, color2):
    # returned value should be bigger than 5 for best readability
    def luminosity(color):
        return 0.2126 * pow(color.red / 255, 2.2) + 0.7152 * pow(color.green, 2.2) + 0.0722 * pow(color.blue, 2.2)

    l1 = luminosity(color1)
    l2 = luminosity(color2)
    return (l1 + 0.05) / (l2 + 0.05) if l1 > l2 else (l2 + 0.05) / (l1 + 0.05)


def _parse2color(color_str):
    red = int(color_str[1:3], 16)
    green = int(color_str[3:5], 16)
    blue = int(color_str[5:7], 16)
    return Color(red=red, green=green, blue=blue)


def _get_points(img):
    points = []
    w, h = img.size
    for count, color in img.getcolors(w * h):
        points.append(Point(color, 3, count))
    return points


def _euclidean(p1, p2):
    return sqrt(sum([
        (p1.coords[i] - p2.coords[i]) ** 2 for i in range(p1.n)
    ]))


def _calculate_center(points, n):
    vals = [0.0 for i in range(n)]
    plen = 0
    for p in points:
        plen += p.ct
        for i in range(n):
            vals[i] += (p.coords[i] * p.ct)
    return Point([(v / plen) for v in vals], n, 1)


def _kmeans(points, k, min_diff):
    clusters = [Cluster([p], p, p.n) for p in random.sample(points, k)]

    while 1:
        plists = [[] for i in range(k)]

        for p in points:
            smallest_distance = float('Inf')
            for i in range(k):
                distance = _euclidean(p, clusters[i].center)
                if distance < smallest_distance:
                    smallest_distance = distance
                    idx = i

            plists[idx].append(p)

        diff = 0
        for i in range(k):
            old = clusters[i]
            center = _calculate_center(plists[i], old.n)
            new = Cluster(plists[i], center, old.n)
            clusters[i] = new
            diff = max(diff, _euclidean(old.center, new.center))

        if diff < min_diff:
            break

    return clusters


_safe_colors_dict = {"Black": "#000000",
                     "Navy": "#000080",
                     "DarkBlue": "#00008B",
                     "MediumBlue": "#0000CD",
                     "Blue": "#0000FF",
                     "DarkGreen": "#006400",
                     "Green": "#008000",
                     "Teal": "#008080",
                     "DarkCyan": "#008B8B",
                     "DeepSkyBlue": "#00BFFF",
                     "DarkTurquoise": "#00CED1",
                     "MediumSpringGreen": "#00FA9A",
                     "Lime": "#00FF00",
                     "SpringGreen": "#00FF7F",
                     "Aqua": "#00FFFF",
                     "MidnightBlue": "#191970",
                     "DodgerBlue": "#1E90FF",
                     "LightSeaGreen": "#20B2AA",
                     "ForestGreen": "#228B22",
                     "SeaGreen": "#2E8B57",
                     "DarkSlateGray": "#2F4F4F",
                     "LimeGreen": "#32CD32",
                     "MediumSeaGreen": "#3CB371",
                     "Turquoise": "#40E0D0",
                     "RoyalBlue": "#4169E1",
                     "SteelBlue": "#4682B4",
                     "DarkSlateBlue": "#483D8B",
                     "MediumTurquoise": "#48D1CC",
                     "Indigo ": "#4B0082",
                     "DarkOliveGreen": "#556B2F",
                     "CadetBlue": "#5F9EA0",
                     "CornflowerBlue": "#6495ED",
                     "MediumAquaMarine": "#66CDAA",
                     "DimGray": "#696969",
                     "SlateBlue": "#6A5ACD",
                     "OliveDrab": "#6B8E23",
                     "SlateGray": "#708090",
                     "LightSlateGray": "#778899",
                     "MediumSlateBlue": "#7B68EE",
                     "LawnGreen": "#7CFC00",
                     "Chartreuse": "#7FFF00",
                     "Aquamarine": "#7FFFD4",
                     "Maroon": "#800000",
                     "Purple": "#800080",
                     "Olive": "#808000",
                     "Gray": "#808080",
                     "SkyBlue": "#87CEEB",
                     "LightSkyBlue": "#87CEFA",
                     "BlueViolet": "#8A2BE2",
                     "DarkRed": "#8B0000",
                     "DarkMagenta": "#8B008B",
                     "SaddleBrown": "#8B4513",
                     "DarkSeaGreen": "#8FBC8F",
                     "LightGreen": "#90EE90",
                     "MediumPurple": "#9370DB",
                     "DarkViolet": "#9400D3",
                     "PaleGreen": "#98FB98",
                     "DarkOrchid": "#9932CC",
                     "YellowGreen": "#9ACD32",
                     "Sienna": "#A0522D",
                     "Brown": "#A52A2A",
                     "DarkGray": "#A9A9A9",
                     "LightBlue": "#ADD8E6",
                     "GreenYellow": "#ADFF2F",
                     "PaleTurquoise": "#AFEEEE",
                     "LightSteelBlue": "#B0C4DE",
                     "PowderBlue": "#B0E0E6",
                     "FireBrick": "#B22222",
                     "DarkGoldenRod": "#B8860B",
                     "MediumOrchid": "#BA55D3",
                     "RosyBrown": "#BC8F8F",
                     "DarkKhaki": "#BDB76B",
                     "Silver": "#C0C0C0",
                     "MediumVioletRed": "#C71585",
                     "IndianRed ": "#CD5C5C",
                     "Peru": "#CD853F",
                     "Chocolate": "#D2691E",
                     "Tan": "#D2B48C",
                     "LightGray": "#D3D3D3",
                     "Thistle": "#D8BFD8",
                     "Orchid": "#DA70D6",
                     "GoldenRod": "#DAA520",
                     "PaleVioletRed": "#DB7093",
                     "Crimson": "#DC143C",
                     "Gainsboro": "#DCDCDC",
                     "Plum": "#DDA0DD",
                     "BurlyWood": "#DEB887",
                     "LightCyan": "#E0FFFF",
                     "Lavender": "#E6E6FA",
                     "DarkSalmon": "#E9967A",
                     "Violet": "#EE82EE",
                     "PaleGoldenRod": "#EEE8AA",
                     "LightCoral": "#F08080",
                     "Khaki": "#F0E68C",
                     "AliceBlue": "#F0F8FF",
                     "HoneyDew": "#F0FFF0",
                     "Azure": "#F0FFFF",
                     "SandyBrown": "#F4A460",
                     "Wheat": "#F5DEB3",
                     "Beige": "#F5F5DC",
                     "WhiteSmoke": "#F5F5F5",
                     "MintCream": "#F5FFFA",
                     "GhostWhite": "#F8F8FF",
                     "Salmon": "#FA8072",
                     "AntiqueWhite": "#FAEBD7",
                     "Linen": "#FAF0E6",
                     "LightGoldenRodYellow": "#FAFAD2",
                     "OldLace": "#FDF5E6",
                     "Red": "#FF0000",
                     "Fuchsia": "#FF00FF",
                     "Magenta": "#FF00FF",
                     "DeepPink": "#FF1493",
                     "OrangeRed": "#FF4500",
                     "Tomato": "#FF6347",
                     "HotPink": "#FF69B4",
                     "Coral": "#FF7F50",
                     "DarkOrange": "#FF8C00",
                     "LightSalmon": "#FFA07A",
                     "Orange": "#FFA500",
                     "LightPink": "#FFB6C1",
                     "Pink": "#FFC0CB",
                     "Gold": "#FFD700",
                     "PeachPuff": "#FFDAB9",
                     "NavajoWhite": "#FFDEAD",
                     "Moccasin": "#FFE4B5",
                     "Bisque": "#FFE4C4",
                     "MistyRose": "#FFE4E1",
                     "BlanchedAlmond": "#FFEBCD",
                     "PapayaWhip": "#FFEFD5",
                     "LavenderBlush": "#FFF0F5",
                     "SeaShell": "#FFF5EE",
                     "Cornsilk": "#FFF8DC",
                     "LemonChiffon": "#FFFACD",
                     "FloralWhite": "#FFFAF0",
                     "Snow": "#FFFAFA",
                     "Yellow": "#FFFF00",
                     "LightYellow": "#FFFFE0",
                     "Ivory": "#FFFFF0",
                     "White": "#FFFFFF"}

safe_colors = OrderedDict(sorted(_safe_colors_dict.items(), key=lambda t: t[1]))

if __name__ == "__main__":
    # print contrast_color("#757575")
    # print darker_color("#FFDAB9")
    print dominant_colorz(r"C:\Work\Project\yaza\yaza\static\assets\design-images-hd\Anonymous_Einstein.png", 1)
    # print dominant_colorz(r"C:\Work\Project\yaza\yaza\static\assets\design-images-hd\bob_marley.png", 1)