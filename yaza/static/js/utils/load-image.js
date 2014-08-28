define(['jquery', 'underscore'], function ($, _) {

    return function loadImage(url) {
        var d = $.Deferred();
        var imageObj = new Image();
        imageObj.crossOrigin = 'Anonymous';
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
