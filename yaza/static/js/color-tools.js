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

    return {
        getColorGrads: getColorGrads,
    }
});
