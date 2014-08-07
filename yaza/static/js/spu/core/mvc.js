define(function () {
    function getCos(p, p1, p2) {
        var a = Math.pow(p1[0] - p[0], 2) + Math.pow(p1[1] - p[1], 2);
        var b = Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2);
        var c = Math.pow(p2[0] - p[0], 2) + Math.pow(p2[1] - p[1], 2);
        return (a + c - b) / (2 * Math.sqrt(a) * Math.sqrt(c));
    }

    function mvc(point, cpPairs) {
        var cpPairsLen = cpPairs.length;

        var weights = [];
        var cp0, cp1, cp2, cos0, cos1, tan0, tan1, w;
        for (var i = 0; i < cpPairsLen; ++i) {
            cp0 = cpPairs[(i - 1 + cpPairsLen) % cpPairsLen][0];
            cp1 = cpPairs[i][0];
            cp2 = cpPairs[(i + 1) % cpPairsLen][0];

            cos0 = getCos(point, cp0, cp1);
            if (cos0 + 1 <= 0) {
                // avoid 180 degree
                cos0 = -0.99;
            }
            if (cos0 > 1) {
                cos0 = 1;
            }
            cos1 = getCos(point, cp1, cp2);
            if (cos1 + 1 <= 0) {
                cos1 = -0.99;
            }
            if (cos1 > 1) {
                // avoid 180 degree
                cos1 = 1;
            }
            tan0 = Math.sqrt((1.0 - cos0) / (1.0 + cos0));
            tan1 = Math.sqrt((1.0 - cos1) / (1.0 + cos1));
            w = (tan0 + tan1) / Math.sqrt(Math.pow(cp1[0] - point[0], 2) + Math.pow(cp1[1] - point[1], 2));
            if (isNaN(w) || !isFinite(w)) {
                w = 0;
            }
            weights.push(w);
        }

        var x = 0.0;
        var y = 0.0;
        var weights_sum = weights.reduce(function (a, b) {
            return a + b;
        }, 0);
        for (var i = 0; i < cpPairsLen; ++i) {
            x += weights[i] * cpPairs[i][1][0];
            y += weights[i] * cpPairs[i][1][1];
        }
        return [x / weights_sum, y / weights_sum];
    }

    return mvc;
});
