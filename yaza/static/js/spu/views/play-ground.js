define(['collections/design-images', 'colors', 'object-manager', 'control-group', 'config', 'svg', 'kineticjs', 'dispatcher', 'backbone', 'underscore', 'handlebars', 'text!templates/uploading-progress.hbs', 'text!templates/uploading-success.hbs', 'text!templates/uploading-fail.hbs', 'text!templates/gallery.hbs', 'text!templates/play-ground.hbs', 'cookies-js', 'jquery', 'jquery.iframe-transport', 'jquery-file-upload', 'bootstrap', 'svg.export', 'block-ui', 'spectrum', 'underscore.string', 'lazy-load'],
    function (DesignImages, make2DColorArray, ObjectManager, makeControlGroup, config, SVG, Kinetic, dispatcher, Backbone, _, handlebars, uploadingProgressTemplate, uploadingSuccessTemplate, uploadingFailTemplate, galleryTemplate, playGroundTemplate, Cookies) {
        _.mixin(_.str.exports());

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
            $(".customer-pics").find(".thumbnail:first").addClass("selected");
        }

        function getBase64FromImage(node) {

            var canvas = document.createElement("canvas");
            canvas.width = node.width();
            canvas.height = node.height();

            var ctx = canvas.getContext("2d");
            ctx.drawImage(node.image(), 0, 0, node.width(), node.height());

            return canvas.toDataURL("image/png");
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
                    this._addImage($img.attr("src"), $img.data('title'), $img.data("design-image-id"));
                },
                'click .add-img-modal .btn-ok': function (evt) {
                    this.$('.add-img-modal').modal('hide');
                    var $img = this.$(".thumbnail.selected img");
                    this._addImage($img.attr("src"), $img.data('title'), $img.data("design-image-id"));
                },
                'click .change-text-panel .btn-default': function (evt) {
                    this.$('.change-text-panel').hide();
                    this.$('.editable-region').unblock();
                    this.$('.dashboard').unblock();
                    this.$('.object-manager').unblock();
                    return false;
                },
                'click .add-text-modal .btn-ok': function (evt) {
                    var text = this.$('.add-text-modal textarea').val().trim();
                    if (!text) {
                        alert('文字不能为空');
                        return;
                    }
                    this.$('.add-text-modal').modal('hide');
                    this.$('.add-text-modal textarea').val("");
                    $.ajax({
                        type: 'POST',
                        url: '/image/font-image',
                        data: {
                            text: text,
                            'font-family': config.DEFAULT_FONT_FAMILY,
                            // 注意, 这里已经是生产大小了
                            'font-size': parseInt(config.DEFAULT_FONT_SIZE * config.PPI / 72),
                            'font-color': config.DEFAULT_FONT_COLOR,
                        },
                        beforeSend: function () {
                            dispatcher.trigger("jitPreview-mask");
                        },
                    }).done(function (playGround) {
                            return function (data) {
                                playGround._addText(data, text);
                            };
                        }(this)).always(function () {
                        dispatcher.trigger("jitPreview-unmask");
                    }).fail(this._fail);
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
                        var ratio = designRegion.size[0] * config.PPI / imageLayer.width();
                        _.each(imageLayer.children, function (node) {
                            if (node.className === "Image") {
                                var im = this._draw.image(
                                        getBase64FromImage(node),
                                        node.width() * ratio,
                                        node.height() * ratio)
                                    .move((node.x() - node.offsetX()) * ratio, (node.y() - node.offsetY()) * ratio)
                                    .rotate(node.rotation(), node.x() * ratio, node.y() * ratio);
                                if (node.image().src.match(/^http/)) {
                                    im.data("design-image-file", node.image().src)
                                }
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
                'click .text-operators .btn-change-text': function () {
                    this._objectManager.activeObject().data('control-group').fire('dblclick');
                    return false;
                },
                'change .text-operators select.font-size': function (evt) {
                    var activeItem = this._objectManager.activeObject();
                    var controlGroup = activeItem.data('control-group');
                    var im = activeItem.data('object');
                    controlGroup.setAttr('font-size', $(evt.currentTarget).val());
                    $.ajax({
                        type: 'POST',
                        url: '/image/font-image',
                        data: {
                            text: im.name(),
                            'font-family': controlGroup.getAttr('font-family'),
                            'font-color': controlGroup.getAttr('text-color'),
                            // 注意, 这里已经是生产大小了
                            'font-size': parseInt(controlGroup.getAttr('font-size') * config.PPI / 72),
                        },
                        beforeSend: function () {
                            dispatcher.trigger("jitPreview-mask");
                        },
                        complete: function () {
                            dispatcher.trigger("jitPreview-unmask");
                        },
                    }).done(function (playGround) {
                            return function (data) {
                                playGround._addText(data, im.name(), im,
                                    controlGroup);
                            };
                        }(this)).fail(this._fail);
                    return false;
                },
                'change .text-operators select.font-family': function (evt) {
                    var activeItem = this._objectManager.activeObject();
                    var controlGroup = activeItem.data('control-group');
                    var im = activeItem.data('object');
                    controlGroup.setAttr('font-family', $(evt.currentTarget).val());
                    $.ajax({
                        type: 'POST',
                        url: '/image/font-image',
                        data: {
                            text: im.name(),
                            'font-family': controlGroup.getAttr('font-family'),
                            'font-color': controlGroup.getAttr('text-color'),
                            // 注意, 这里已经是生产大小了
                            'font-size': parseInt(controlGroup.getAttr('font-size') * config.PPI / 72),
                        },
                        beforeSend: function () {
                            dispatcher.trigger("jitPreview-mask");
                        },
                    }).done(function (playGround) {
                            return function (data) {
                                playGround._addText(data, im.name(), im,
                                    controlGroup);
                            };
                        }(this)).always(function () {
                        dispatcher.trigger("jitPreview-unmask");
                    }).fail(this._fail);
                    return false;
                },
                'click .btn-tag': function (evt) {
                    if (this.$('.tags-list').is(':visible')) {
                        this.$('.tags-list').hide();
                    } else {
                        this.$('.tags-list').css({
                            width: '0px',
                            height: '90px',
                            position: 'absolute',
                        }).show().animate({
                            width: "100%",
                            height: '90px',
                        });
                    }
                },
                'click .add-img-modal .tags-list button.close': function (evt) {
                    this.$('.tags-list').hide();
                },
                'click .add-img-modal .tags-list a.tag': function (evt) {
                    var tagId = $(evt.currentTarget).data('tag-id');
                    this._selectTag(tagId, $(evt.currentTarget).find('b').text());
                    return false;
                },
                'mouseenter .thumbnail img': function (evt) {
                    return false;
                },

                'mouseleave .thumbnail img': function (evt) {
                    return false;
                },

            },

            initialize: function (options) {
                this.tagList = options.tagList;

                dispatcher.on('ocspu-selected', function (ocspu) {
                    this.$('.touch-screen .editable-region').css('background-color',
                        ocspu.rgb);
                    this._complementaryColor = ocspu.complementaryColor;
                    this._hoveredComplementColor = ocspu.hoveredComplementColor;
                    if (!!this._controlLayer) {
                        this._controlLayer.getChildren().forEach(function (group) {
                            var rect = group.find('.rect')[0];
                            if (group.getAttr("trasient")) {
                                rect.stroke(this._hoveredComplementColor);
                            } else {
                                rect.stroke(this._complementaryColor);
                            }
                        }.bind(this));
                        this._controlLayer.draw();
                    }
                }, this);

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
                                this._objectManager.add(node, node.getAttr("control-group"));
                            }.bind(this));
                    }
                    dispatcher.trigger('update-hotspot', this._imageLayer);
                }, this);

                dispatcher.on('active-object', function (controlGroup) {
                    console.log('active object');
                    this._controlLayer.getChildren().forEach(function (group) {
                        group.hide();
                        group.find('.rect')[0].stroke(this._hoveredComplementColor);
                        group.setAttr('trasient', true);
                    }.bind(this));

                    if (!controlGroup.getAttr('hidden')) {
                        controlGroup.show();
                    }
                    controlGroup.moveToTop();
                    controlGroup.setAttr('trasient', false);
                    controlGroup.find('.rect')[0].stroke(this._complementaryColor);
                    this._controlLayer.draw();
                    this._objectManager.activeObjectIndicator(controlGroup);
                    this._resetDashboard(controlGroup);
                }, this);
            },

            render: function () {
                this.$el.prepend(this._template({
                    tagList: this.tagList,
                }));
                this._objectManager = new ObjectManager({
                    el: this.$('.object-manager'),
                }).render();
                this._stage = new Kinetic.Stage({
                    container: this.$('.editable-region')[0],
                });
                this.$('.nav-tabs a:first').tab('show');

                var playGround = this;
                this.$('.add-img-modal').on('show.bs.modal', function () {
                    // 动态计算一页可以展示的图片数量
                    if (!playGround._designImagesPerPage) {
                        var fakeImage = $('<li><div class="thumbnail"></div></li>');
                        fakeImage = $(fakeImage.appendTo(playGround.$('ul.thumbnails'))[0]).hide();
                        var imagesOneRow = Math.floor($(this).find('.thumbnails').width() / fakeImage.width());
                        var imagesOneColumn = Math.ceil($(this).find('.thumbnails').height() / fakeImage.height());
                        fakeImage.remove();
                        playGround._designImagesPerPage = imagesOneColumn * imagesOneRow;
                    }
                    playGround._selectTag(playGround._currentTagId || 0);
                    playGround._renderUserPics();
                }).on('shown.bs.modal', function (e) {

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
                            playGround._renderUserPics();
                            _selectFirstCustomerImg();
                        },
                        fail: function (e, data) {
                            $(this).find('.uploading-progress').html(templateFail());
                            $(this).find('.uploading-progress').fadeOut(1000);
                        }
                    });
                });
                this._draw = SVG(this.$('.svg-drawing')[0]);
                this.$('.text-color').spectrum({
                    showPalette: true,
                    preferredFormat: "name",
                    chooseText: "确定",
                    cancelText: "取消",
                    showInput: true,
                    showAlpha: true,
                    palette: make2DColorArray(10),
                    change: (function (playGround) {
                        return function (color) {
                            var activeItem = playGround._objectManager.activeObject();
                            var controlGroup = activeItem.data('control-group');
                            var im = activeItem.data('object');
                            controlGroup.setAttr('text-color', color.toHexString());
                            $.ajax({
                                type: 'POST',
                                url: '/image/font-image',
                                data: {
                                    text: im.name(),
                                    'font-family': controlGroup.getAttr('font-family'),
                                    'font-color': color.toHexString(),
                                    // 注意, 这里已经是生产大小了
                                    'font-size': parseInt(controlGroup.getAttr('font-size') * config.PPI / 72),
                                },
                                beforeSend: function () {
                                    dispatcher.trigger("jitPreview-mask");
                                },
                            }).done(function (data) {
                                playGround._addText(data, im.name(), im,
                                    controlGroup);
                            }).always(function () {
                                dispatcher.trigger("jitPreview-unmask");
                            }).fail(this._fail);
                        };
                    })(playGround),
                });
                this.$('select.font-size').html(
                    config.FONT_SIZE_LIST.map(
                        function (fontSize) {
                            return _.sprintf('<option value="%s">%s pt</option>', fontSize, fontSize);
                        }).join(''));
                this.$('select.font-family').html(
                    config.FONT_FAMILY_LIST.map(
                        function (fontFamily) {
                            return _.sprintf('<option value="%s">%s</option>', fontFamily, fontFamily);
                        }).join(''));

                this.$('.thumbnails').scroll(function (playGround) {
                    var lastScroll = 0;
                    return function (evt) {
                        var lastImg = $(evt.target).find('img:last');
                        // 必须判断是否向下, 因为当最后一页的时候, 向上滚动不能触发加载图片
                        if ($(this).scrollTop() > lastScroll && lastImg.offset().top + lastImg.height() / 2 < this.getBoundingClientRect().bottom) {
                            if (playGround._noMoreDesignImages) {
                                playGround.$('.toast').show();
                                setInterval(function () {
                                    playGround.$('.toast').fadeOut();
                                }, 1000);
                            } else {
                                playGround._loadMoreDesignImages();
                            }
                        }
                        lastScroll = $(this).scrollTop();
                        return false;
                    }
                }(this));
                this.$('a[data-toggle="tab"]').on('shown.bs.tab', 
                        function (playGround) {
                            return function (e) {
                                if (e.target.href.match(/.*\.customer-pics$/)) {
                                    playGround.$('.btn-tag').attr('disabled', '');
                                    playGround.$('.tags-list').hide();
                                } else {
                                    playGround.$('.btn-tag').removeAttr('disabled');
                                }
                            };
                        }(this));
            },

            _renderUserPics: function () {
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
                this.$('.add-img-modal .customer-pics').html(gallery);

            },

            _selectFirstIfSelectedEmpty: function () {
                if (this.$("ul.thumbnails .thumbnail.selected img").length == 0) {
                    this.$(".builtin-pics .thumbnail:first").addClass("selected");
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

            _addImage: function (src, title, design_image_id) {
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
                        "design-image-id": design_image_id,
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
                    image.setAttr("control-group", group);
                    this._controlLayer.add(group).draw();
                    this._objectManager.add(image, group);
                    dispatcher.trigger('update-hotspot', this._imageLayer);
                }, this);
                imageObj.src = src;
            },

            _addText: function (data, text, oldIm, oldControlGroup) {
                console.log('add text ' + text);
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
                                y: height / 2,
                            },
                        });
                        playGround._imageLayer.add(im);
                        var controlGroup = makeControlGroup(im, text).on('dragend',
                                function (playGround) {
                                    return function () {
                                        playGround._imageLayer.draw();
                                        dispatcher.trigger('update-hotspot',
                                            playGround._imageLayer);
                                    };
                                }(playGround)).on('mousedown',function () {
                                if (this.getAttr('trasient')) {
                                    dispatcher.trigger('active-object', this);
                                }
                            }).setAttr('object-type', 'text').setAttr(
                                'text-color',
                                oldControlGroup ? oldControlGroup.getAttr('text-color')
                                    : config.DEFAULT_FONT_COLOR
                            ).setAttr('font-size',
                                oldControlGroup ? oldControlGroup.getAttr('font-size')
                                    : config.DEFAULT_FONT_SIZE
                            ).setAttr('font-family',
                                oldControlGroup ? oldControlGroup.getAttr('font-family')
                                    : config.DEFAULT_FONT_FAMILY);

                        im.setAttr("control-group", controlGroup);

                        controlGroup.off('dblclick').on('dblclick', function (playGround) {
                            return function (evt) {
                                // 之所以不用position, 是因为chrome下面position方法有bug
                                var left = controlGroup.x() - im.width() / 2;
                                left = Math.max(left, 0);
                                left += playGround.$('.editable-region').offset().left;
                                left -= playGround.$('.editable-region').parent().offset().left;
                                var top = controlGroup.y() - im.height() / 2;
                                top += playGround.$('.editable-region').offset().top,
                                    top -= playGround.$('.editable-region').parent().offset().top;
                                playGround.$('.change-text-panel').css({
                                    left: left,
                                    top: top,
                                    position: 'absolute',
                                }).show();
                                ['.editable-region', '.object-manager', '.dashboard'].forEach(
                                    function (className) {
                                        playGround.$(className).block({
                                            message: null,
                                            overlayCSS: {
                                                backgroundColor: "#ccc",
                                                opacity: 0.4,
                                            },
                                            baseZ: 0,
                                        });
                                    });
                                playGround.$('.change-text-panel textarea').val(im.name());
                                playGround.$('.change-text-panel textarea').focus();
                                playGround.$('.change-text-panel .btn-primary').off('click').click(function () {
                                    var text = playGround.$('.change-text-panel textarea').val().trim();
                                    playGround.$('.change-text-panel').hide();
                                    $.ajax({
                                        type: 'POST',
                                        url: '/image/font-image',
                                        data: {
                                            text: text,
                                            'font-family': controlGroup.getAttr('font-family'),
                                            // 注意, 这里已经是生产大小了
                                            'font-size': parseInt(controlGroup.getAttr('font-size') * config.PPI / 72),
                                            'font-color': controlGroup.getAttr('text-color'),
                                        },
                                        beforeSend: function () {
                                            dispatcher.trigger("jitPreview-mask");
                                        },
                                    }).done(function (data) {
                                        console.log("don");
                                        playGround._addText(data, text, im,
                                            controlGroup);
                                    }).fail(playGround._fail).always(function () {
                                        dispatcher.trigger("jitPreview-unmask");
                                        playGround.$('.editable-region ').unblock();
                                        playGround.$('.object-manager').unblock();
                                        playGround.$('.dashboard').unblock();
                                    });
                                });
                            };
                        }(playGround));
                        if (oldIm && oldControlGroup) {
                            im.setZIndex(oldIm.getZIndex());
                            im.rotation(oldIm.rotation());
                            im.position(oldIm.position());
                            controlGroup.position(oldControlGroup.position());
                            controlGroup.rotation(oldControlGroup.rotation());
                            oldIm.destroy();
                            oldControlGroup.destroy();
                            playGround._objectManager.replace(im, controlGroup,
                                oldIm, oldControlGroup);
                            playGround._controlLayer.draw();
                        } else {
                            playGround._objectManager.add(im, controlGroup);
                        }
                        playGround._controlLayer.add(controlGroup).draw();
                        playGround._imageLayer.draw();
                        dispatcher.trigger('update-hotspot', playGround._imageLayer);
                    }
                }(this));
            },

            _resetDashboard: function (controlGroup) {
                if (controlGroup.getAttr('object-type') == 'text') {
                    this.$('.text-operators').show();
                    this.$('.text-operators .text-color').spectrum('set',
                        controlGroup.getAttr('text-color') || config.DEFAULT_FONT_COLOR);
                    this.$('.text-operators select.font-size').val(controlGroup.getAttr('font-size') || config.DEFAULT_FONT_SIZE);
                    this.$('.text-operators select.font-family').val(controlGroup.getAttr('font-family') || config.DEFAULT_FONT_FAMILY);
                } else {
                    this.$('.text-operators').hide();
                }
            },

            _fail: function (jqXHR, textStatus, errorThrown) {
                alert("服务器异常！");
            },

            _selectTag: function (tagId, tag) {
                this.$('.tags-list').fadeOut();
                if (this._currentTagId == tagId) {
                    return;
                }
                this._currentTagId = tagId;
                this.$(".builtin-pics .thumbnails").empty();
                this.$("span.selected-tag").text(tag || '不限标签');
                this._loadMoreDesignImages(function () {
                    this._selectFirstIfSelectedEmpty(); 
                }.bind(this));
            },

            _loadMoreDesignImages: function (after) {
                var designImages = new DesignImages(this._currentTagId, this.$('.builtin-pics .thumbnails img').length / this._designImagesPerPage, this._designImagesPerPage);
                designImages.fetch({reset: true});
                designImages.on('reset', function (playGround) {
                    return function (evt) {
                        var thumbnails = playGround.$(".builtin-pics .thumbnails");
                        this.each(function (element, index, list) {
                            var s = '<li><div class="thumbnail"><img src="%s" alt="%s" data-title="%s"></img></div></li>'
                            var e = $(_.sprintf(s, element.get('thumbnail'),
                                    element.get('title'), element.get('title')));
                            thumbnails.append(e);
                            $(e).find('img').lazyLoad();
                        });
                        if (playGround.$('.builtin-pics .thumbnails img').length >= designImages.totalCnt) {
                            playGround._noMoreDesignImages = true;
                        }
                        after && after();
                    }
                }(this));
            }
        });
        return PlayGround;
    });
