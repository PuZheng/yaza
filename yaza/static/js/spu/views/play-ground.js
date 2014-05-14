define(['svg', 'kineticjs', 'dispatcher', 'backbone', 'underscore', 'handlebars', 'text!templates/uploading-progress.hbs', 'text!templates/uploading-success.hbs', 'text!templates/uploading-fail.hbs', 'text!templates/gallery.hbs', 'text!templates/play-ground.hbs', 'cookies-js', 'jquery', 'jquery.iframe-transport', 'jquery-file-upload', 'bootstrap', 'svg.export'],
    function (SVG, Kinetic, dispatcher, Backbone, _, handlebars, uploadingProgressTemplate, uploadingSuccessTemplate, uploadingFailTemplate, galleryTemplate, playGroundTemplate, Cookies) {

        function stringToByteArray(str) {
            var array = new (window.Uint8Array !== void 0 ? Uint8Array : Array)(str.length);
            var i;
            var il;

            for (i = 0, il = str.length; i < il; ++i) {
                array[i] = str.charCodeAt(i) & 0xff;
            }

            return array;
        }

        handlebars.default.registerHelper("eq", function (target, source, options) {
            if (target === source) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });

        function formatFileSize(bytes) {
            if (typeof bytes !== 'number') {
                return '';
            }

            if (bytes >= 1000000000) {
                return (bytes / 1000000000).toFixed(2) + ' GB';
            }

            if (bytes >= 1000000) {
                return (bytes / 1000000).toFixed(2) + ' MB';
            }

            return (bytes / 1000).toFixed(2) + ' KB';
        }

        function _selectFirstCustomerImg() {
            $(".thumbnails .thumbnail").removeClass("selected");
            $("#customer-pics").find(".thumbnail:first").addClass("selected");
        }

        var PlayGround = Backbone.View.extend({
            _template: handlebars.default.compile(playGroundTemplate),
            _initMargin: 70,
            _designRegionCache: {},
            
            // 使用currentTarget而不是target，原因：
            //            event.currentTarget
            //            The current DOM element within the event bubbling phase.
            events: {
                'click .thumbnails .thumbnail': function (evt) {
                    this.$(".thumbnails .thumbnail").removeClass("selected");
                    this.$(evt.currentTarget).addClass("selected");
                },
                'dblclick .thumbnails .thumbnail': function (evt) {
                    this.$(".thumbnails .thumbnail").removeClass("selected");
                    this.$(evt.currentTarget).addClass("selected");
                    this.$('.add-img-modal').modal('hide');
                    var $img = this.$(".thumbnail.selected img")
                    this._addImage($img.attr("src"), $img.data('title'));
                },
                'click .btn-ok': function (evt) {
                    this.$('.add-img-modal').modal('hide');
                    var $img = this.$(".thumbnail.selected img")
                    this._addImage($img.attr("src"), $img.data('title'));
                },
                'click .touch-screen .btn-save': function (evt) {
                    this._draw.clear();
                    if (_.chain(this._designRegionCache).values().all(function (cache) {
                        return cache.imageLayer.children.length == 0;
                    }).value()) {
                        alert('您尚未作出任何定制，请先定制!'); 
                        return;
                    }
                    var nested = null;
                    var data = {};
                    for (var name in this._designRegionCache) {
                        var imageLayer = this._designRegionCache[name].imageLayer;
                        var offsetY = !!nested? nested.height() + 30: 0;
                        var designRegion = this._designRegionCache[name].designRegion;
                        this._draw.clear();
                        this._draw.size(designRegion.size[0], designRegion.size[1])
                            .data('name', name);
                        var ratio = designRegion.size[0] / imageLayer.width(); 
                        _.each(imageLayer.children, function (node) {
                            if (node.className === "Image") {
                                var im = this._draw.image(
                                    // 注意，必须保证获取整个image
                                    node.toDataURL({
                                        x: node.x() - node.offsetX(), 
                                        y: node.y() - node.offsetY(), 
                                        width: node.width(), 
                                        height: node.height(),
                                        quality: 0.5, // 不能用来直接打印生产，不用高清
                                    }), 
                                    node.width() * ratio, 
                                    node.height() * ratio)
                                    .move((node.x() - node.offsetX()) * ratio, (node.y() - node.offsetY()) * ratio)
                                    .rotate(node.rotation());
                            }
                            data[designRegion.name] = this._draw.exportSvg({whitespace: true});
                        }, this) 
                    }
                    $(evt.currentTarget).addClass('disabled');
                    $.ajax({
                        type: 'POST',
                        url: '/image/design-pkg', 
                        data: data,
                    }).done(function (data) {
                            var uri = "data:application/svg+xml;base64," + data;
                            // 注意, $.click仅仅是调用handler，并不是真正触发事件，
                            // 必须直接在html element上调用click, 而且注意要
                            // 避免click扩散到父级元素
                            $(evt.currentTarget).find('a').attr('href', uri).attr('download', new Date().getTime() + ".zip").click(function (evt) {
                                evt.stopPropagation();
                            })[0].click();
                    }).always(function () {
                        $(evt.currentTarget).removeClass('disabled');
                    });
                },
            },

            initialize: function (options) {
                this._design_image_list = options.design_image_list;

                dispatcher.on('design-region-selected', function (designRegion) {
                    console.log('design region ' + designRegion.name + ' selected');
                    if (!this._currentDesignRegion || this._currentDesignRegion.name != designRegion.name) {
                        var ts = this.$('.touch-screen');
                        var er = this.$('.touch-screen .editable-region');
                        if (designRegion.size[1] * ts.width() > ts.height() * designRegion.size[0]) {
                            er.addClass('portrait').removeClass('landspace');
                            er.css('width', designRegion.size[0] * ts.height() / designRegion.size[1]);
                        } else {
                            er.addClass('landspace').removeClass('portrait');
                            er.css('height', designRegion.size[1] * ts.width() / designRegion.size[0]);
                        }
                        this._stage.width(er.width());
                        this._stage.height(er.height());
                        this._currentDesignRegion = designRegion;
                        var cache = this._designRegionCache[designRegion.name];
                        !!this._imageLayer && this._imageLayer.remove();
                        !!this._controlLayer && this._controlLayer.remove();
                        if (cache) {
                            this._controlLayer = cache.controlLayer;
                            this._imageLayer = cache.imageLayer;
                        } else {
                            this._controlLayer = new Kinetic.Layer();
                            this._imageLayer = new Kinetic.Layer();
                            this._designRegionCache[this._currentDesignRegion.name] = {
                                imageLayer: this._imageLayer,
                                controlLayer: this._controlLayer,
                                designRegion: designRegion,
                            }
                        }
                        this._imageLayer.width(this._stage.width());
                        this._imageLayer.height(this._stage.height());
                        this._controlLayer.width(this._stage.width());
                        this._controlLayer.height(this._stage.height());
                        this._stage.add(this._imageLayer);
                        this._stage.add(this._controlLayer);
                        this._stage.draw();
                    }
                    dispatcher.trigger('update-hotspot', this._imageLayer);
                }, this);

            },

            render: function () {
                this.$el.prepend(this._template({"design_image_list": this._design_image_list}));
                this._stage = new Kinetic.Stage({
                    container: this.$('.editable-region')[0],
                });
                this.$('.nav-tabs a:first').tab('show');

                var playGround = this;
                this.$('.add-img-modal').on('show.bs.modal', this._selectFirstIfSelectedEmpty).on('shown.bs.modal', function (e) {

                    var templateProgress = handlebars.default.compile(uploadingProgressTemplate);
                    var templateSuccess = handlebars.default.compile(uploadingSuccessTemplate);
                    var templateFail = handlebars.default.compile(uploadingFailTemplate);
                    //playGround.$('.nav-tabs a:first').tab('show');
                    $(this).find('.upload-img-form').fileupload({
                        dataType: 'json',
                        add: function (e, data) {
                            $('.nav-tabs a:last').tab('show');
                            $(this).find('.uploading-progress').html(
                                templateProgress({
                                    fileSize: formatFileSize(data.files[0].size),
                                })).show();
                            var reader = new FileReader();
                            reader.onload = _.bind(function (e) {
                                $(this).find('.uploading-progress img').attr('src', e.target.result);
                            }, this);
                            reader.readAsDataURL(data.files[0]);
                            // Automatically upload the file once it is added to the queue
                            var jqXHR = data.submit();
                            $(this).find('.uploading-progress .upload-cancel-btn').click(
                                function () {
                                    jqXHR.abort();
                                    $(this).find('.uploading-progress').fadeOut(1000);
                                });
                        },
                        progress: function (e, data) {
                            // Calculate the completion percentage of the upload
                            var progress = parseInt(data.loaded / data.total * 100, 10);

                            // Update the hidden input field and trigger a change
                            // so that the jQuery knob plugin knows to update the dial
                            $(this).find('.uploading-progress .progress-bar').text(progress + '%').css('width', progress + '%');
                        },
                        done: function (e, data) {
                            $(this).find('.uploading-progress').html(templateSuccess());
                            $(this).find('.uploading-progress').fadeOut(1000);
                            Cookies.set('upload-images',
                                data.result.filename + '||' + (Cookies.get('upload-images') || ''), {expires: 7 * 24 * 3600});
                            playGround._renderGallery();
                            _selectFirstCustomerImg();
                        },
                        fail: function (e, data) {
                            $(this).find('.uploading-progress').html(templateFail());
                            $(this).find('.uploading-progress').fadeOut(1000);
                        }
                    });
                });
                this._renderGallery();
                this._draw = SVG(this.$('.svg-drawing')[0]);
            },

            _renderGallery: function () {
                var template = handlebars.default.compile(galleryTemplate);
                var rows = [];
                var upload_images = (Cookies.get('upload-images') || '').trim();
                if (!!upload_images) {
                    upload_images = _.filter(upload_images.split('||'), function (val) {
                        return !!val;
                    });
                    var row = [];
                    _.each(upload_images, function (img, idx) {
                        if (idx > 0 && idx % 4 == 0) {
                            rows.push(row);
                            row = [];
                        }
                        row.push(img);
                    });
                    if (row.length > 0) {
                        rows.push(row);
                    }
                }
                var gallery = $(template(rows));
                this.$('.add-img-modal #customer-pics').html(gallery);

            },

            _selectFirstIfSelectedEmpty: function () {
                if ($(".thumbnail.selected img").length == 0) {
                    $("#builtin-pics .thumbnail:first").addClass("selected");
                }
            },
            
            _addImage: function (src, title) {
                if (!title) { // 用户自己上传的图片没有title
                    title = (new Date()).getTime(); 
                }
                // 将图片按比例缩小，并且放在正中
                var er = this.$('.touch-screen .editable-region');
                var imageObj = new Image();
                imageObj.onload = _.bind(function () {
                    var width = er.width() - 2 * this._initMargin;
                    var height = er.height() - 2 * (this._initMargin * er.width() / er.height());
                    if (imageObj.height * width > imageObj.width * height) {
                        // portrait
                        width = imageObj.width * height / imageObj.height; 
                    } else {
                        height = imageObj.height * width / imageObj.width;
                    }

                    var image = new Kinetic.Image({
                        x: er.width() / 2,
                        y: er.height() / 2,
                        image: imageObj,
                        width: width,
                        height: height,
                        name: title, 
                        offset: {
                            x: width / 2,
                            y: height / 2,
                        },
                    });
                    this._imageLayer.add(image);
                    this._imageLayer.draw();

                    // 注意，group本身没有大小，位置也是固定的, 能拖动的是
                    // group里面的元素
                    var group = new Kinetic.Group({
                        x: er.width() / 2,
                        y: er.height() / 2,
                        draggable: true,
                        name: title,
                    });
                    group.on('dragstart', function() {
                        this.moveToTop();
                    });
                    group.on('dragend', function (playGround) {
                        return function() {
                            image.position({
                                x: group.x(),
                                y: group.y(),
                            });
                            playGround._imageLayer.draw();
                            dispatcher.trigger('update-hotspot', playGround._imageLayer);
                        }
                    }(this));
                    var rect = new Kinetic.Rect({
                        x: -width / 2,
                        y: -height / 2,
                        stroke: 'gray',
                        strokeWidth: 1,
                        width: width,
                        height: height,
                        dash: [5, 5],
                        name: 'rect',
                    });
                    group.add(rect);
                    var line = new Kinetic.Line({
                        stroke: 'gray',
                        strokeWidth: 1,
                        points: [0, - (height / 2 + this._initMargin - 30), 0, 0],
                        dash: [5, 5],
                        name: 'handle-bar-line',
                    });
                    group.add(line);
                    var circle = new Kinetic.Circle({
                        x: 0,
                        y: 0,
                        fill: 'red',
                        radius: 3,
                        name: 'center',
                    });
                    group.add(circle);
                    this._controlLayer.add(group);
                    this._addAnchor(group, - width / 2, -height / 2, 'topLeft');
                    this._addAnchor(group, width / 2, -height / 2, 'topRight', width / 2, height / 2);
                    this._addAnchor(group, width / 2, height / 2, 'bottomRight', width / 2, height / 2);
                    this._addAnchor(group, -width / 2, height / 2, 'bottomLeft', width / 2, height / 2);
                    this._addRotationHandleBar(group, 0,
                            -(height / 2 + this._initMargin - 30), 'handleBar');
                    this._controlLayer.draw();

                    dispatcher.trigger('update-hotspot', this._imageLayer);
                }, this);
                imageObj.src = src;
            },

            _addRotationHandleBar: function (group, x, y, name) {
                var anchor = new Kinetic.Circle({
                    x: x,
                    y: y,
                    stroke: '#666',
                    fill: 'yellow',
                    strokeWidth: 2,
                    radius: 6,
                    name: name,
                    draggable: true,
                });
                anchor.on('mouseover', function() {
                    var layer = this.getLayer();
                    document.body.style.cursor = 'pointer';
                    this.setStrokeWidth(4);
                    layer.draw();
                });
                anchor.on('mouseout', function() {
                    var layer = this.getLayer();
                    document.body.style.cursor = 'default';
                    this.strokeWidth(2);
                    layer.draw();
                });
                anchor.on('mousedown touchstart', function() {
                    group.setDraggable(false);
                    this.moveToTop();
                });
                anchor.on('dragmove', function (playGround) {
                    return function() {
                        var dx = this.x();
                        var dy = this.y();
                        var line = group.find('.handle-bar-line');
                        line.points([0, -Math.sqrt(dx * dx + dy * dy), 0, 0]);
                        var degree = Math.atan2(dx, -dy) * 180 / Math.PI;
                        group.rotate(degree);
                        this.rotate(-degree);
                        var image = playGround._imageLayer.find('.' + group.name())[0];
                        image.rotate(degree);
                        playGround._imageLayer.draw();
                    };
                }(this));

                anchor.on('dragend', function (playGround) {
                    return function () {
                        group.setDraggable(true);
                    };
                }(this));

                group.add(anchor);
            },

            _addAnchor: function (group, x, y, name) {

                var anchor = new Kinetic.Circle({
                    x: x,
                    y: y,
                    stroke: '#666',
                    fill: '#ddd',
                    strokeWidth: 2,
                    radius: 7,
                    name: name,
                    draggable: true,
                    dragOnTop: false,
                });
                anchor.on('mouseover', function() {
                    var layer = this.getLayer();
                    document.body.style.cursor = 'pointer';
                    this.setStrokeWidth(4);
                    layer.draw();
                });
                anchor.on('mouseout', function() {
                    var layer = this.getLayer();
                    document.body.style.cursor = 'default';
                    this.strokeWidth(2);
                    layer.draw();
                });
                anchor.on('mousedown touchstart', function() {
                    group.setDraggable(false);
                    this.moveToTop();
                });

                var stage = group.getStage();
                var layer = group.getLayer();
                anchor.on('dragmove', function (playGround) {
                    return function() {
                        playGround._update(this);
                    }
                }(this));

                var playGround = this;
                anchor.on('dragend', function () {
                    // 重新计算group的位置, 以保证始终能按照物理中心进行旋转 
                    var rect = group.find('.rect')[0];
                    var offsetX = rect.x() + rect.width() / 2;
                    var offsetY = rect.y() + rect.height() / 2;
                    group.move({
                        x: offsetX,
                        y: offsetY,
                    });
                    group.getChildren().each(function (node) {
                        node.move({
                            x: -offsetX,
                            y: -offsetY,
                        });
                    })
                    layer.draw();
                    group.setDraggable(true);
                });

                group.add(anchor);
            },

            _update: function (anchor) {
                // 这里调整group中所有元素的位置, 而不是直接移动group,
                // 原因是, 如果移动group, 本anchor就得移动回来,这个时候和
                // 鼠标就脱节了
                var group = anchor.getParent();

                var topLeft = group.find('.topLeft')[0];
                var topRight = group.find('.topRight')[0];
                var bottomRight = group.find('.bottomRight')[0];
                var bottomLeft = group.find('.bottomLeft')[0];

                var anchorX = anchor.x();
                var anchorY = anchor.y();


                var rect = group.find('.rect')[0];
                var image = this._imageLayer.find('.' + group.name())[0];
                var oldWidth = rect.width();
                var oldHeight = rect.height();

                switch (anchor.name()) {
                    case 'topLeft':
                        rect.position({
                            x: anchorX,
                            y: anchorY,
                        });
                        topRight.y(anchorY);
                        bottomLeft.x(anchorX);

                        var newWidth = topRight.x() - topLeft.x();
                        var newHeight = bottomLeft.y() - topLeft.y();
                        var offsetX = (oldWidth - newWidth) / 2;
                        var offsetY = (oldHeight - newHeight) / 2;
                        break;
                    case 'topRight':
                        rect.y(anchorY);
                        topLeft.y(anchorY);
                        bottomRight.x(anchorX);
                        var newWidth = topRight.x() - topLeft.x();
                        var newHeight = bottomLeft.y() - topLeft.y();
                        var offsetX = -(oldWidth - newWidth) / 2;
                        var offsetY = (oldHeight - newHeight) / 2;
                        break;
                    case 'bottomRight':
                        topRight.x(anchorX);
                        bottomLeft.y(anchorY);
                        var newWidth = topRight.x() - topLeft.x();
                        var newHeight = bottomLeft.y() - topLeft.y();
                        var offsetX = -(oldWidth - newWidth) / 2;
                        var offsetY = -(oldHeight - newHeight) / 2;
                        break;
                    case 'bottomLeft':
                        rect.x(anchorX);
                        topLeft.x(anchorX);
                        bottomRight.y(anchorY);
                        var newWidth = topRight.x() - topLeft.x();
                        var newHeight = bottomLeft.y() - topLeft.y();
                        var offsetX = (oldWidth - newWidth) / 2;
                        var offsetY = -(oldHeight - newHeight) / 2;
                        break;
                }

                rect.width(newWidth).height(newHeight);
                // 注意, 移动image, x, y设定在了物理中心
                image.size(rect.size()).move({
                    x: offsetX,
                    y: offsetY,
                }).offset({
                    x: newWidth / 2,
                    y: newHeight / 2,
                });
                ['.handleBar', '.handle-bar-line', '.center'].forEach(function (nodeName) {
                    group.find(nodeName)[0].move({
                        x: offsetX,
                        y: offsetY,
                    });
                });
                group.getLayer().draw();
                this._imageLayer.draw();
            }
        });
        return PlayGround;
    });


