window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
_.mixin(_.str.exports());
$(function () {
    var fileMap = {}, svgFile, fileName;
    $('input.design-image-dir').change(function () {
        fileMap = {};
        for (var i = 0; i < this.files.length; ++i) {
            fileMap[this.files[i].name] = this.files[i];
        }
    });

    $('input.select-design').change(function () {
        var _file = this.files[0];
        if (_file.type == "image/svg+xml") {
            //IE 这里居然返回的是 ""！！！
            var reader = new FileReader();
            reader.onload = function (e) {
                svgFile = e.target.result;
                fileName = _file.name;
            };
            reader.readAsText(_file);
        }
    });

    $("#convert").click(function () {
        if (_.isEmpty(fileMap)) {
            alert("请选择高清设计图");
            return false;
        }
        if (!svgFile) {
            alert("请选择svg");
            return false;
        }

        convert(svgFile);
    });

    function convert(svg) {
        $('div.alert').hide();
        var parse = new DOMParser();
        var xmlDoc = parse.parseFromString(svg, 'text/xml');
        var height = xmlDoc.children[0].getAttribute('height');
        var width = xmlDoc.children[0].getAttribute('width');
        // 必须先按顺序将所有的image元素保存在一个数组中, 不能直接往html里面
        // append, 因为FileReader.onload是异步的
        var images = new Array($(svg).find('image').length);
        var d = $.Deferred();
        d.promise().then(initDownload);
        var processedImages = 0;
        $(svg).find('image').each(function (idx) {
            var href = $(this).data('design-image-file');
            if (href) {
                href = href.split("?")[0];
                if(_(href).endsWith(".duri")){
                    href = href.substr(0, href.lastIndexOf(".duri")) + ".png";
                }

                var file = fileMap[href.replace(/.*\//, '')];
                if (file) {
                    var fr = new FileReader();
                    fr.onload = function (idx, image) {
                        return function (e) {
                            var img = new Image();
                            img.src = 'data:image/png;base64,' + btoa(e.target.result);
                            img.onload = function () {
                                var canvas = document.createElement("canvas");
                                canvas.width = $(image).attr('width');
                                canvas.height = $(image).attr('height');
                                var ctx = canvas.getContext("2d");
                                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                href = canvas.toDataURL("image/png");
                                $(image).attr('xlink:href', href);
                                images[idx] = $(image);
                                if (++processedImages == $(svg).find('image').length) {
                                    d.resolve(images, fileName, height, width);
                                }
                            };
                        };
                    }(idx, this);
                    fr.readAsBinaryString(fileMap[href.replace(/.*\//, '')])
                } else {
                    $('div.alert').html('警告! 找不到' + href.replace(/.*\//, '') + '对应的高清设计图!').show();
                    images[idx] = $(this);
                    if (++processedImages == $(svg).find('image').length) {
                        d.resolve(images, fileName, height, width);
                    }
                }
            } else {
                images[idx] = $(this);
                if (++processedImages == $(svg).find('image').length) {
                    d.resolve(images, fileName, height, width);
                }
            }
        });
    }

    function initDownload(images, fileName, height, width) {
        var result = $('<div><svg xmlns:xlink="http://www.w3.org/1999/xlink" height="' + height + '" width="' + width + '" version="1.1" xmlns="http://www.w3.org/2000/svg"></svg></div>');
        images.forEach(function (image) {
            result.find('svg').append(image);
        });
        var content = '<?xml version="1.0" encoding="UTF-8"?>';
        content += $(result).html();

        var name = fileName.match(/.*\./)[0] + "hd.svg";

        if (Blob) {
            // 不管IE了
            var blob = new Blob([content], {type: "image/svg+xml"});
            saveAs(blob, name);
        }
    }
});
