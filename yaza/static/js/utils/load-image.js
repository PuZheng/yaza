define(['jquery', 'getImageData'], function ($) {

    return function loadImage(url) {
        var d = $.Deferred();
        if ($.support.cors || url.indexOf("http") !== 0) {
            var imageObj = new Image();
            imageObj.crossOrigin = 'Anonymous';
            imageObj.onload = function () {
                d.resolve(imageObj);
            }.bind(this);
            imageObj.src = url;
        } else {
            $.getImageData({
                url: url,
                success: function (image) {
                    d.resolve(image)
                }.bind(this),
            })
        }
        return d;
    }
})
