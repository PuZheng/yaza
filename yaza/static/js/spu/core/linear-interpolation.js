define([], function () {

    function bilinear(p, x, y) {
        return (x * p[0][0] + (1 - x) * p[0][1]) * y + 
        (x * p[1][0] + (1 - x) * p[1][1] ) * (1 - y);
    }

    return bilinear;
});
