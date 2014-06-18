define([], function () {

    function bilinear(p, x, y) {
        var sum = 0;
        for (var i = 0; i < 3; ++i) {
            for (var j = 0; j < 3; ++j) {
                sum += p[i][j];
            }
        }
        return sum/9;
    }

    return bilinear;
});
