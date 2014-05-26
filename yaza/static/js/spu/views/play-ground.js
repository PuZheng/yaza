define(['object-manager', 'control-group', 'config', 'svg', 'kineticjs', 'dispatcher', 'backbone', 'underscore', 'handlebars', 'text!templates/uploading-progress.hbs', 'text!templates/uploading-success.hbs', 'text!templates/uploading-fail.hbs', 'text!templates/gallery.hbs', 'text!templates/play-ground.hbs', 'cookies-js', 'jquery', 'jquery.iframe-transport', 'jquery-file-upload', 'bootstrap', 'svg.export'],
    function (ObjectManager, makeControlGroup, config, SVG, Kinetic, dispatcher, Backbone, _, handlebars, uploadingProgressTemplate, uploadingSuccessTemplate, uploadingFailTemplate, galleryTemplate, playGroundTemplate, Cookies) {

        //获取32位长度的Guid号
        function newGuid() {
            var guid = getRandomString(8) + "-" + getRandomString(4) + "-" + getRandomString(4) + "-" + getRandomString(4) + "-" + getRandomString(16);
            return guid;
        }

        function getRandomString(length) {
            var rand = "";
            for (i = 0; i < length; i++) {
                if (i % 2 == 0) {
                    rand += String.fromCharCode(randomletter());
                }
                else {
                    rand += randomNumber();
                }
            }
            return rand;
        }

        function randomletter() {
            var rand = Math.floor(Math.random() * 25) + 65;
            return rand;
        }

        function randomNumber() {
            var rand = Math.floor(Math.random() * 9);
            return rand;
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
                    var $img = this.$(".thumbnail.selected img");
                    this._addImage($img.attr("src"), $img.data('title'));
                },
                'click .add-img-modal .btn-ok': function (evt) {
                    this.$('.add-img-modal').modal('hide');
                    var $img = this.$(".thumbnail.selected img");
                    this._addImage($img.attr("src"), $img.data('title'));
                },
                'click .add-text-modal .btn-ok': function (evt) {
                    var text = this.$('.add-text-modal textarea').val();
                    if (!text) {
                        alert('文字不能为空');
                        return;
                    }
                    this.$('.add-text-modal').modal('hide');
                    $.ajax({
                        type: 'POST', 
                        url: '/image/font-image',
                        data: {
                            text: text,
                            'font-family': config.DEFAULT_FONT_FAMILY,
                            // 注意, 这里已经是生产大小了
                            'font-size': parseInt(config.DEFAULT_FONT_SIZE * config.PPI / 72),
                        },
                    }).done(function (playGround) {
                        return function (data) {
                            playGround._addText(data, text);
                        };
                    }(this));
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
                        var offsetY = !!nested ? nested.height() + 30 : 0;
                        var designRegion = this._designRegionCache[name].designRegion;
                        this._draw.clear();
                        this._draw.size(designRegion.size[0] * config.PPI, designRegion.size[1] * config.PPI)
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
                        this._objectManager.empty();
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

                        this._imageLayer.getChildren(function (node) {
                            return node.getClassName() == "Image";
                        }).sort(function (a, b) {
                            return a.getZIndex() - b.getZIndex();
                        }).forEach(function (node) {
                            this._objectManager.add(node);
                        }.bind(this));
                    }
                    dispatcher.trigger('update-hotspot', this._imageLayer);
                }, this);

                dispatcher.on('active-object', function (controlGroup) {
                    this._controlLayer.getChildren().forEach(function (group) {
                        group.hide(); 
                        group.find('.rect')[0].stroke('gray');
                        group.setAttr('trasient', true);
                    });
                    controlGroup.moveToTop();
                    if (controlGroup.getAttr('visible')) {
                        controlGroup.show();
                    }
                    controlGroup.setAttr('trasient', false);
                    controlGroup.find('.rect')[0].stroke('#CC3333');
                    this._controlLayer.draw();
                    this._objectManager.activeObjectIndicator(controlGroup);
                }, this);
            },

            render: function () {
                this.$el.prepend(this._template({"design_image_list": this._design_image_list}));
                this._objectManager = new ObjectManager({
                    el: this.$('.object-manager'),
                }).render();
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

            _setupButtons: function () {
                var container = this.$('[name=custom-pics]');

                $(container.find("button.up-btn")).attr("disabled", false).show();
                $(container.find("button.down-btn")).attr("disabled", false).show();

                if (container.find("[name=list-group-item-buttons]").size() > 1) {
                    $(container.find("button.up-btn:first")).attr("disabled", true);
                    $(container.find("button.down-btn:last")).attr("disabled", true);
                } else {
                    $(container.find("button.up-btn")).hide();
                    $(container.find("button.down-btn")).hide();
                }
            },

            _addImage: function (src, title) {
                if (!title) { // 用户自己上传的图片没有title
                    title = new Date().getTime();
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

                    var group = makeControlGroup(image, title, true).on('dragend', 
                            function (playGround) {
                                return function () {
                                    playGround._imageLayer.draw();
                                    dispatcher.trigger('update-hotspot', playGround._imageLayer);
                                };
                            }(this)).on('mousedown', function () {
                                if (this.getAttr('trasient')) {
                                    dispatcher.trigger('active-object', this); 
                                }
                            });
                    this._controlLayer.add(group).draw();
                    this._objectManager.add(image, group);
                    dispatcher.trigger('update-hotspot', this._imageLayer);
                }, this);
                imageObj.src = src;
            },

            _addText: function (data, text) {
                var imageObj = new Image();
                $(imageObj).attr('src', "data:image/png;base64," + data.data).one('load', function (playGround) {
                    return function () {
                        var scale = playGround._imageLayer.width() / (playGround._currentDesignRegion.size[0] * config.PPI);
                        var width = data.width * scale;
                        var height = data.height * scale;
                        // 将文字放在正中
                        var im = new Kinetic.Image({
                            x: playGround._imageLayer.width() / 2,
                            y: playGround._imageLayer.height() / 2,
                            width: width,
                            name: text,
                            height: height,
                            image: imageObj,
                            offset: {
                                x: width / 2,
                                y: height /2,
                            },
                        });
                        playGround._imageLayer.add(im);
                        playGround._imageLayer.draw();
                        var controlGroup = makeControlGroup(im, text).on('dragend',
                            function (playGround) {
                                return function () {
                                    playGround._imageLayer.draw();
                                    dispatcher.trigger('update-hotspot', 
                                        playGround._imageLayer);
                                };
                            }(playGround)).on('mousedown', function () {
                                if (this.getAttr('trasient')) {
                                    dispatcher.trigger('active-object', this); 
                                }
                            });
                        playGround._controlLayer.add(controlGroup).draw();
                        playGround._objectManager.add(im, controlGroup);
                        dispatcher.trigger('update-hotspot', playGround._imageLayer);
                    }
                }(this));
            }
            
        });
        return PlayGround;
    });
