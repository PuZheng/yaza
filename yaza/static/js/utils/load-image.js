define(['jquery', 'underscore'], function ($, _) {

    return function loadImage(url) {
        var d = $.Deferred();
        var imageObj = new Image();
        if (_(url).startsWith('http://')) {
            imageObj.crossOrigin = 'Anonymous'; // 一定不能乱加cors, 在firefox下面会出错
        }
        imageObj.onload = function () {
            d.resolve(imageObj);
        }.bind(this);
        if (_(url).endsWith('.duri')) {
            $.get(url, function (data) {
                imageObj.src = data;
            });
        } else {
            imageObj.src = url;
        }
        return d;
    }
})
