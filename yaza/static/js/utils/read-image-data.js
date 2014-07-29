define(function () {

    var readImageData = function (image, width, height) {
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        return ctx.getImageData(0, 0, canvas.width,
            canvas.height).data;
    }

    return readImageData;
    
});
