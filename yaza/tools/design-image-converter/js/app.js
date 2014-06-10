window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
$(function () {
    var fileMap = {};
    chrome.storage.sync.get('design-image-dir', function (items) {
        $('span.design-image-dir').text(items['design-image-dir']);
    });
    $('input.design-image-dir').change(function (evt) {
        fileMap = {};
        for (var i = 0; i < this.files.length; ++i) {
            fileMap[this.files[i].name] = this.files[i];
        }
    })
    $('button.design-image-dir').click(function () {
        chrome.fileSystem.chooseEntry({
            type: 'openDirectory'
        }, function (entry, fileEntries) {
            chrome.fileSystem.getDisplayPath(entry, function (displayPath) {
                chrome.storage.sync.set({'design-image-dir': displayPath}, function() {
                    // show the directory path
                    $('span.design-image-dir').text(displayPath);
                });
            });
        });
    });
    
    $('button.select-design').click(function () {
        chrome.fileSystem.chooseEntry({
            type: 'openFile'
        }, function (entry, fileEntries) {
            entry.file(function (file) {
                var fr = new FileReader();
                fr.onload = function (e) {
                    convert(e.target.result, $('span.design-image-dir').text(), file.name)
                };
                fr.readAsText(file);
            });
        });
    });
    function errorHandler(e) {
        var msg = '';

        switch (e.code) {
            case FileError.QUOTA_EXCEEDED_ERR:
                msg = 'QUOTA_EXCEEDED_ERR';
                break;
            case FileError.NOT_FOUND_ERR:
                msg = 'NOT_FOUND_ERR';
                break;
            case FileError.SECURITY_ERR:
                msg = 'SECURITY_ERR';
                break;
            case FileError.INVALID_MODIFICATION_ERR:
                msg = 'INVALID_MODIFICATION_ERR';
                break;
            case FileError.INVALID_STATE_ERR:
                msg = 'INVALID_STATE_ERR';
                break;
            default:
                msg = 'Unknown Error';
                break;
        };

        console.log('Error: ' + msg);
    }

    function convert(svg, dir, fileName) {
        var parse = new DOMParser();
        var xmlDoc = parse.parseFromString(svg, 'text/xml');
        var height = xmlDoc.rootElement.getAttribute('height');
        var width = xmlDoc.rootElement.getAttribute('width');
        // 必须先按顺序将所有的image元素保存在一个数组中, 不能直接往html里面
        // append, 因为FileReader.onload是异步的
        var images = new Array($(svg).find('image').length);
        var d = $.Deferred();
        d.promise().then(initDownload);
        var processedImages = 0;
        $(svg).find('image').each(function (idx) {
            var href = $(this).data('design-image-file');
            if (href) {
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
                    $('p.warning').html('警告! 找不到' + href.replace(/.*\//, '') + '对应的高清设计图!');
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
        })
        var content = '<?xml version="1.0" encoding="UTF-8"?>';
        content += $(result).html();
        $('a').attr('href', 'data:application/svg+xml,' + content).attr('download', fileName.match(/.*\./)[0] + "hd.svg").click(function (evt) {
            evt.stopPropagation();
        })[0].click();
    }
});
