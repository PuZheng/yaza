/**
 * Created by Young on 14-5-5.
 */
define(function () {
    //获取颜色梯度数据
    function getStep(start, end, step) {
        var colors = [], start = getColor(start), end = getColor(end),
            stepR = (end[0] - start[0]) / step,
            stepG = (end[1] - start[1]) / step,
            stepB = (end[2] - start[2]) / step;
        //生成颜色集合
        for (var i = 0, r = start[0], g = start[1], b = start[2]; i < step; i++) {
            colors[i] = [r, g, b];
            r += stepR;
            g += stepG;
            b += stepB;
        }
        colors[i] = end;
        //修正颜色值
        return _.map(colors, function (x) {
            return _.map(x, function (x) {
                return Math.min(Math.max(0, Math.floor(x)), 255);
            });
        });
    }

    //获取颜色数据
    var frag;

    function getColor(color) {
        var ret = getData(color);
        if (ret === undefined) {
            if (!frag) {
                frag = document.createElement("textarea");
                frag.style.display = "none";
                document.body.insertBefore(frag, document.body.childNodes[0]);
            }
            try {
                frag.style.color = color;
            } catch (e) {
                return [0, 0, 0];
            }//ie opera

            if (document.defaultView) {
                //opera #rrggbb
                ret = getData(document.defaultView.getComputedStyle(frag, null).color);
            } else {
                color = frag.createTextRange().queryCommandValue("ForeColor");
                ret = [ color & 0x0000ff, (color & 0x00ff00) >>> 8, (color & 0xff0000) >>> 16 ];
            }
        }
        return ret;
    }

    //获取颜色数组
    function getData(color) {
        var re = RegExp;
        if (/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.test(color)) {
            //#rrggbb
            return _.map([ re.$1, re.$2, re.$3 ], function (x) {
                return parseInt(x, 16);
            });
        } else if (/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.test(color)) {
            //#rgb
            return _.map([ re.$1, re.$2, re.$3 ], function (x) {
                return parseInt(x + x, 16);
            });
        } else if (/^rgb\((.*),(.*),(.*)\)$/i.test(color)) {
            //rgb(n,n,n) or rgb(n%,n%,n%)
            return _.map([ re.$1, re.$2, re.$3 ], function (x) {
                return x.indexOf("%") > 0 ? parseFloat(x, 10) * 2.55 : x | 0;
            });
        }
    }

    function getColorGrads(colors, step) {
        var ret = [], len = colors.length;
        if (step === undefined) {
            step = 20;
        }
        if (len == 1) {
            ret = getStep(colors[0], colors[0], step);
        } else if (len > 1) {
            for (var i = 0, n = len - 1; i < n; i++) {
                var steps = getStep(colors[i], colors[i + 1], step);
                i < n - 1 && steps.pop();
                ret = ret.concat(steps);
            }
        }
        return ret;
    }


    var namedColors = {
        "aqua": "#00ffff",
        "black": "#000000",
        "blue": "#0000ff",
        "fuchsia": "#ff00ff",
        "gray": "#808080",
        "green": "#008000",
        "lime": "#00ff00",
        "maroon": "#800000",
        "navy": "#000080",
        "olive": "#808000",
        "orange": "#ffa500",
        "purple": "#800080",
        "red": "#ff0000",
        "silver": "#c0c0c0",
        "teal": "#008080",
        "white": "#ffffff",
        "yellow": "#ffff00"
    }

    function getHex(color) {
        var hexColor = namedColors[color];
        if (!!hexColor) {
            color = hexColor;
        }
        var result = [];
        for (var i = 1; i < 7; i = i + 2) {
            result.push(parseInt("0x" + color.substr(i, 2)))
        }
        return result;
    }

    function colDiff(color1, color2) {
        return Math.abs(color1[0] - color2[0]) + Math.abs(color1[1] - color2[1]) + Math.abs(color1[2] - color2[2]);
    }

    function brghtDiff(color1, color2) {
        function getBright(color) {
            return (299 * color[0] + 587 * color[1] + 114 * color[2]) / 1000;
        }

        return Math.abs(getBright(color1) - getBright(color2));
    }


    function lumDiff(color1, color2) {
        function getLuminosity(color) {
            return  0.2126 * Math.pow(color[0] / 255, 2.2) +
                0.7152 * Math.pow(color[1] / 255, 2.2) +
                0.0722 * Math.pow(color[2] / 255, 2.2)
        }

        var l1 = getLuminosity(color1);

        var l2 = getLuminosity(color2);
        if (l1 > l2) {
            return (l1 + 0.05) / (l2 + 0.05);
        } else {
            return (l2 + 0.05) / (l1 + 0.05);
        }
    }

    function pythDiff(color1, color2) {
        var redDiff = color1[0] - color1[0];
        var greenDiff = color1[1] - color1[1];
        var blueDiff = color1[2] - color2[2];

        return  Math.sqrt(redDiff * redDiff + greenDiff * greenDiff + blueDiff * blueDiff);
    }

    function getComlementColor(color) {
        var decColor = getHex(color);
        for (var red = 255; red > -1; red--) {
            var redStr = (red).toString(16);
            if (red < 16) {
                redStr = "0" + redStr;
            }
            for (var green = 255; green > -1; green--) {
                var greenStr = (green).toString(16);
                if (green < 16) {
                    greenStr = "0" + greenStr
                }
                for (var blue = 255; blue > -1; blue--) {
                    var blueStr = (blue).toString(16);
                    if (blue < 16) {
                        blueStr = "0" + blueStr;
                    }
                    var targetColor = "#" + redStr + greenStr + blueStr;
                    var decTargetColor = getHex(targetColor);
                    if ((colDiff(decColor, decTargetColor) > 500) && (brghtDiff(decColor, decTargetColor) > 125
                                ) && (lumDiff(decColor, decTargetColor) > 5) && (pythDiff(decColor, decTargetColor) > 250)) {
                                    return targetColor;
                                }
                }
            }
        }
        return "#ffffff";
    };

    function isOnePointZero(n) {
        return typeof n == "string" && n.indexOf('.') != -1 && parseFloat(n) === 1;
    }

    function isPercentage(n) {
        return typeof n === "string" && n.indexOf('%') != -1;
    }


    function bound01(n, max) {
        if (isOnePointZero(n)) {
            n = "100%";
        }

        var processPercent = isPercentage(n);
        n = Math.min(max, Math.max(0, parseFloat(n)));

        // Automatically convert percentage into number
        if (processPercent) {
            n = parseInt(n * max, 10) / 100;
        }

        // Handle floating point rounding errors
        if ((Math.abs(n - max) < 0.000001)) {
            return 1;
        }

        // Convert into [0, 1] range if it isn't already
        return (n % max) / parseFloat(max);
    }

    function rgbToHsv(r, g, b) {
        r = bound01(r, 255);
        g = bound01(g, 255);
        b = bound01(b, 255);

        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, v = max;

        var d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max == min) {
            h = 0; // achromatic
        }
        else {
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }
        return { h: h, s: s, v: v };
    }

    function hsvToRgb(h, s, v) {
        h = bound01(h, 360) * 6;
        s = bound01(s, 100);
        v = bound01(v, 100);

        var i = Math.floor(h),
            f = h - i,
            p = v * (1 - s),
            q = v * (1 - f * s),
            t = v * (1 - (1 - f) * s),
            mod = i % 6,
            r = [v, q, p, p, t, v][mod],
            g = [t, v, v, q, p, p][mod],
            b = [p, p, t, v, v, q][mod];

        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    }

    function getDarkerColor(color, degree) {
        var hex = getHex(color);
        var hsv = rgbToHsv(hex[0], hex[1], hex[2]);
        var darkerColor = hsvToRgb(hsv["h"] * 100, hsv["s"] * 100, (hsv["v"] * 100 - degree) ? (hsv["v"] * 100 - degree) : 0);
        var redStr = darkerColor["r"] > 16 ? darkerColor["r"].toString(16) : "0" + darkerColor["r"].toString(16);
        var greenStr = darkerColor["g"] > 16 ? darkerColor["g"].toString(16) : "0" + darkerColor["g"].toString(16);
        var blueStr = darkerColor["b"] > 16 ? darkerColor["b"].toString(16) : "0" + darkerColor["b"].toString(16);
        return "#" + redStr + greenStr + blueStr;
    }

    return {
        getColorGrads: getColorGrads,
        getComlementColor: getComlementColor,
        getDarkerColor: getDarkerColor,
    }
});
