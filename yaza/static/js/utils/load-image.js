define(['jquery'], function ($) {

    return function loadImage(url) {
        var d = $.Deferred();
        var imageObj = new Image();
        imageObj.crossOrigin = 'Anonymous';
        imageObj.onload = function () {
            d.resolve(imageObj);
        }.bind(this);
        imageObj.src = url;
        return d;
    }
})
