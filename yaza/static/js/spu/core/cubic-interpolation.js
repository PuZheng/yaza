define([], function () {
    function cubic(p, x) {
        return p[1] + 0.5 * x*(p[2] - p[0] + x*(2.0*p[0] - 5.0*p[1] + 4.0*p[2] - p[3] + x*(3.0*(p[1] - p[2]) + p[3] - p[0])));
        return (p[0] + p[1] + p[2] + p[3]) / 4;
	}

    function bicubic(p, x, y) {
        var arr = new Array(4);
        arr[0] = cubic(p[0], x);
		arr[1] = cubic(p[1], x);
		arr[2] = cubic(p[2], x);
		arr[3] = cubic(p[3], x);
		return parseInt(cubic(arr, y));
    }

    return {
        cubic: cubic,
        bicubic: bicubic
    }
});
