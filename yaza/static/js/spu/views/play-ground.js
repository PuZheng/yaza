define(['jquery', 'backbone', 'handlebars', 'text!templates/play-ground.hbs', 
'spu/config', 'spu/control-group', 'kineticjs', 'dispatcher', 'color-tools', 
'utils/load-image', 
'jquery.scrollTo', 'js-url', 'block-ui'], 
function ($, Backbone, handlebars, playGroundTemplate, config, makeControlGroup, 
Kinetic, dispatcher, colorTools, loadImage, ObjectManager) {

    var __debug__ = ($.url('?debug') == '1');

    var PlayGround = Backbone.View.extend({
        _template: handlebars.default.compile(playGroundTemplate),

        events: {
            'click .change-text-panel .btn-default': function (evt) {
                this.$('.change-text-panel').hide();
                this.$('.editable-region').unblock();
                this.$('.dashboard').unblock();
                this.$('.object-manager').unblock();
                return false;
            },
        },

        initialize: function (option) {
            this._spu = option.spu;
        },
        

        render: function () {
            this.$el.html(this._template());

            this._setupEventsHandler();
            this.$mask = this.$(".mask");
            this.$mask.css("line-height", this.$(".hotspot").height() + "px");
            this.$container = this.$('.editable-region');
            this._stage = new Kinetic.Stage({
                container: this.$container[0]
            });

            this._backgroundLayer = new Kinetic.Layer();
            this._stage.add(this._backgroundLayer);

            this._designRegionAnimationLayer = new Kinetic.Layer({
                name: "design-region-animation-layer"
            });
            this._stage.add(this._designRegionAnimationLayer);

            this._controlLayer = new Kinetic.Layer();
            if (__debug__) {
                this._controlLayer.add(new Kinetic.Rect({
                    strokeWidth: '1px',
                    stroke: 'blue',
                    name: 'frame',
                }));
            }
            this._stage.add(this._controlLayer);

            this._crossLayer = new Kinetic.Layer();
            var verticalLine = new Kinetic.Line({
                points: [],
                stroke: 'pink',
                strokeWidth: 1,
                lineCap: 'round',
                lineJoin: 'round',
                name: "vertical"
            });
            var horizontalLine = new Kinetic.Line({
                points: [],
                stroke: 'pink',
                strokeWidth: 1,
                lineCap: 'round',
                lineJoin: 'round',
                name: "horizontal"
            });
            this._crossLayer.add(verticalLine);
            this._crossLayer.add(horizontalLine);
            this._crossLayer.hide();
            this._stage.add(this._crossLayer);

            return this;
        },

        _setupEventsHandler: function () {
            this.on('aspect-selected', function (aspect) {
                this.$mask.show();
                aspect.getImage().done(function (aspect) {
                    this.$mask.hide();
                    this._setupAspectImage(aspect); 
                }.bind(this)); 
            })
            .on('design-region-selected', function (designRegion) {
                this.$mask.show();
                this._currentDesignRegion = designRegion; 
                designRegion.getPreviewEdges({
                    x: this._backgroundLayer.width() / designRegion.aspect.size[0],
                    y: this._backgroundLayer.height() / designRegion.aspect.size[1]
                }).done(function () {
                    designRegion.getBlackShadow(this._backgroundLayer.width(), this._backgroundLayer.height())
                    .done(function () {
                        designRegion.getWhiteShadow(this._stage.width(), this._stage.height())
                        .done(function () {
                            this.$mask.hide();
                            this._designRegionAnimate(designRegion.previewEdges);
                            this._controlLayer.size(designRegion.imageLayer.size()).position(designRegion.imageLayer.position());
                            this._controlLayer.find('.frame').size(this._controlLayer.size());
                            this._crossLayer.find('.vertical').points([
                                -this._controlLayer.offsetX() + this._controlLayer.width() / 2, 
                                0, 
                                -this._controlLayer.offsetX() + this._controlLayer.width() / 2, 
                                this._stage.height()]);
                            this._crossLayer.find('.horizontal').points([
                                0, 
                                -this._controlLayer.offsetY() + this._controlLayer.height() / 2,
                                this._stage.width(),
                                -this._controlLayer.offsetY() + this._controlLayer.height() / 2]);

                            dispatcher.trigger('design-region-setup', designRegion);
                            this._stage.draw();
                        }.bind(this));
                    }.bind(this));
                }.bind(this));
            })
            .on('design-image-selected', function (arg) {
                console.log(arg);
                this._addDesignImage(arg.url, arg.title, arg.designImageId); 
            })
            .on('active-object', function (controlGroup) {
                var complementaryColor = this._currentAspect.ocspu.complementaryColor;
                var backgroundColor = this._currentAspect.ocspu.rgb;
                this._controlLayer.getChildren().forEach(function (group) {
                    if (group.nodeType == 'Group') {
                        group.find('.rect')[0].stroke(backgroundColor);
                        group.setAttr('trasient', true);
                    }
                });

                controlGroup.moveToTop();
                controlGroup.setAttr('trasient', false);
                controlGroup.find('.rect')[0].stroke(complementaryColor);
                this._activeObject = controlGroup;
                this._controlLayer.draw();
            }, this)
            .on('mask', function (text) {
                this.$mask.show();
                this.$mask.find('p').text(text);
            }, this)
            .on('unmask', function (text) {
                this.$mask.hide(); 
            }, this)
            .on('add-text', function (data, text) {
                this._addText(data, text);
            }, this)
            .on('text-object-changed', function (type, val) {
                var controlGroup = this._activeObject;
                var im = controlGroup.getAttr('target');
                switch (type) {
                    case 'color':
                        controlGroup.setAttr('text-color', val.toHexString());
                        break;
                    case 'font-size':
                        controlGroup.setAttr('font-size', val);
                        break;
                    case 'font-family':
                        controlGroup.setAttr('font-family', val);
                        break;
                    default:
                        throw "invalid arguments for event text-object-changed";
                        break;
                }
                var playGround = this;
                $.ajax({
                    type: 'POST',
                    url: '/image/font-image',
                    data: {
                        text: im.name(),
                        'font-family': controlGroup.getAttr('font-family'),
                        'font-color': controlGroup.getAttr('text-color'),
                        // 注意, 这里已经是生产大小了
                        'font-size': parseInt(controlGroup.getAttr('font-size') * config.PPI / 72)
                    },
                    beforeSend: function () {
                        playGround.$mask.show();
                    }
                }).done(function (data) {
                    playGround._addText(data, im.name(), im,
                        controlGroup);
                }).always(function () {
                    playGround.$mask.hide();
                }).fail(this._fail);
            }, this);
        },

        _setupAspectImage: function (aspect) {
            this._clearAspect();
            this._currentAspect = aspect;
            var imgObj = new Image();
            imgObj.onload = function (e) {
                e.target.crossOrigin = 'Anonymous';
                // setup dom 
                var asPortait = aspect.size[1] / aspect.size[0] > this.$el.height() / this.$el.width();
                if (asPortait) {
                    var imageWidth = aspect.size[0] * this.$el.height() / aspect.size[1];
                    var imageHeight = this.$el.height();
                } else {
                    var imageHeight = aspect.size[1] * this.$el.width() / aspect.size[0];
                    var imageWidth = this.$el.width();
                }
                this.$container.width(imageWidth + config.PLAYGROUND_MARGIN * 2).height(imageHeight + config.PLAYGROUND_MARGIN * 2);
                var $touchScreenEl = this.$('.touch-screen');
                if (asPortait) {
                    $touchScreenEl.scrollTo({
                        left: (this.$container.width() - imageWidth) / 2, 
                        top: config.PLAYGROUND_MARGIN,
                    });
                } else {
                    $touchScreenEl.scrollTo({
                        left: config.PLAYGROUND_MARGIN, 
                        top: (this.$container.height() - imageHeight) / 2, 
                    });
                }
                // setup canvas
                this._stage.width(this.$container.width()).height(this.$container.height());

                var offsetX = config.PLAYGROUND_MARGIN;
                var offsetY = config.PLAYGROUND_MARGIN;
                if (asPortait) {
                    offsetX +=  (this.$el.width() - imageWidth) / 2;
                } else {
                    offsetY += (this.$el.height() - imageHeight) / 2;
                }
                this._backgroundLayer.width(imageWidth).height(imageHeight)
                    .destroyChildren().position({
                        x: offsetX,
                        y: offsetY,
                    });
                var marginRect = new Kinetic.Rect({
                    width: this._stage.width(),
                    height: this._stage.height(),
                    fill: aspect.ocspu.marginColor,
                    x: -offsetX,
                    y: -offsetY,
                });
                this._backgroundLayer.add(marginRect);
                var backgroundRect = new Kinetic.Rect({
                    width: imageHeight,
                    height: imageHeight,
                    fill: aspect.ocspu.paddingColor,
                });
                this._backgroundLayer.add(backgroundRect);
                var im = new Kinetic.Image({
                    image: e.target,
                    width: imageWidth,
                    height: imageHeight
                });
                this._backgroundLayer.add(im);

                this._designRegionAnimationLayer.size(this._backgroundLayer.size())
                .position(this._backgroundLayer.position());

                aspect.designRegionList.forEach(function (stage, backgroundLayer) {
                    return function (dr) {
                        dr.previewLayer.size(backgroundLayer.size()).offset(backgroundLayer.offset());
                        stage.add(dr.previewLayer); 
                        dr.getPreviewEdges({
                            x: backgroundLayer.width() / aspect.size[0],
                            y: backgroundLayer.height() / aspect.size[1]
                        }).done(function () {
                            // 找到最小的可以包住design region的框, 而且比例要和
                            // design region平铺的比例一致
                            // 当然这也隐含着一个假设， 就是design region
                            // 只能做刚体形变， 否则图片的控制框，可能包不住
                            // 预览图片.
                            // 这个框的算法是（以portrait为例）， 上边和design
                            // region的上沿对齐， 下边和design region的下沿对齐，
                            // 左边和右边到design region的左沿和右沿距离相等
                            if (dr.previewHeight() / dr.previewWidth() > dr.size[1] / dr.size[0]) {
                                dr.imageLayer.size({
                                    width: dr.size[0] * dr.previewHeight() / dr.size[1],
                                    height: dr.previewHeight(),
                                })
                                dr.imageLayer.position({
                                    x: backgroundLayer.x() + dr.previewLeft() - (dr.imageLayer.width() - dr.previewWidth()) / 2,
                                    y: backgroundLayer.y() + dr.previewBottom(),
                                });
                            } else {
                                dr.imageLayer.size({
                                    width: dr.previewWidth(),
                                    height: dr.size[1] * dr.previewWidth() / dr.size[0],
                                });
                                dr.imageLayer.position({
                                    x: backgroundLayer.x() + dr.previewLeft(),
                                    y: backgroundLayer.y() + dr.previewBottom() - (dr.imageLayer.height() - dr.previewHeight()) / 2,
                                });
                                console.log(dr.imageLayer.position());
                            }
                            stage.add(dr.imageLayer);
                            dr.imageLayer.moveToBottom();
                            // TODO make the aspect's preview
                        });
                    }
                }(this._stage, this._backgroundLayer));
                this._stage.draw();

                dispatcher.trigger('aspect-image-setup-done', aspect);

            }.bind(this);
            imgObj.src = aspect.picUrl;
        },

        _clearAspect: function () {
            if (this._currentAspect) {
                this._currentAspect.designRegionList.forEach(function (dr) {
                    dr.clearLayers();
                });         
            }
        },

        _designRegionAnimate: function (edges) {
            var data = [];
            ['top', 'left', 'bottom', 'right'].forEach(function (position) {
                edges[position].forEach(function (point) {
                    data.push(point[0]);
                    data.push(point[1]);
                });
            });
            var designRegionHex = new Kinetic.Line({
                points: data,
                stroke: 'red',
                strokeWidth: 1,
                name: 'highlight-frame'
            });

            this._designRegionAnimationLayer.add(designRegionHex);

            var period = 2000;

            this._colorTrans(designRegionHex, period / 100);
            designRegionHex.transIn();
        },

        _colorTrans: function (obj, period) {
            obj._colors = colorTools.getColorGrads(['red', "#FFF"], 20);

            obj._index = 0;
            obj._set = function () {
                var color = obj._colors[Math.min(Math.max(0, obj._index), obj._colors.length - 1)];
                obj.stroke("rgb(" + color.join(",") + ")");
                obj.draw();
            };

            obj.transIn = function () {
                obj._index++;
                obj._set();
                if (obj._index < obj._colors.length - 1) {
                    obj._timer = setTimeout(_.bind(obj.transIn, obj), period);
                } else {
                    obj._timer = setTimeout(function () {
                        var layer = obj.getLayer();
                        obj.destroy();
                        layer.draw();
                    }, period);
                }
            };
        },
        
        _addDesignImage: function (src, title, designImageId) {
            if (!title) { // 用户自己上传的图片没有title
                title = new Date().getTime();
            }

            loadImage(src).done(function (imageObj) {
                // 将图片按比例缩小，并且放在正中
                var imageLayer = this._currentDesignRegion.imageLayer;
                if (imageObj.height / imageObj.width > imageLayer.height() / imageLayer.width()) {
                    // portrait
                    var height = imageLayer.height(); 
                    var width = imageObj.width * height / imageObj.height;
                } else {
                    var width = imageLayer.width();
                    var height = imageObj.height * width / imageObj.width;
                }
                var image = new Kinetic.Image({
                    x: imageLayer.width() / 2,
                    y: imageLayer.height() / 2,
                    image: imageObj,
                    width: width,
                    "design-image-id": designImageId,
                    height: height,
                    name: title,
                    offset: {
                        x: width / 2,
                        y: height / 2
                    }
                });
                imageLayer.add(image);
                imageLayer.draw();

                var hoveredComplementaryColor = this._currentAspect.ocspu.hoveredComplementaryColor;
                var backgroundColor = this._currentAspect.ocspu.rgb;
                var group = makeControlGroup(image, title, true, backgroundColor, 
                hoveredComplementaryColor).on('dragend',
                    function (view) {
                        return function () {
                            view._crossLayer.hide();
                            view._crossLayer.moveToBottom();
                            view._stage.draw();
                            if (__debug__) {
                                imageLayer.moveToTop();
                                setTimeout(function () {
                                    imageLayer.moveToBottom();
                                }, 1000);
                            }
                            dispatcher.trigger('update-hotspot', view._imageLayer);
                        };
                    }(this)).on('mousedown', function () {
                        if (this.getAttr('trasient')) {
                            dispatcher.trigger('active-object', this);
                        }
                    }).on("dragmove", function (view) {
                        return function () {
                            view._crossLayer.show();
                            view._crossLayer.moveToTop();
                            view._stage.draw();

                            this.snap(this.getLayer().width() / 2, this.getLayer().height() / 2, config.MAGNET_TOLERANCE);
                        }
                    }(this));
                image.setAttr("control-group", group);
                this._controlLayer.add(group).draw();
                dispatcher.trigger('object-added', image, group);
                dispatcher.trigger('update-hotspot', imageLayer);
                
            }.bind(this));

        },

        _addText: function (data, text, oldIm, oldControlGroup) {
            var imageObj = new Image();
            $(imageObj).attr('src', "data:image/png;base64," + data.data).one('load', 
            function (view) {
                return function () {
                    var imageLayer = view._currentDesignRegion.imageLayer;
                    var scale = imageLayer.width() / (view._currentDesignRegion.size[0] * config.PPI);
                    var width = data.width * scale;
                    var height = data.height * scale;
                    // 将文字放在正中
                    var im = new Kinetic.Image({
                        x: imageLayer.width() / 2,
                        y: imageLayer.height() / 2,
                        width: width,
                        name: text,
                        height: height,
                        image: imageObj,
                        offset: {
                            x: width / 2,
                            y: height / 2
                        }
                    });
                    imageLayer.add(im);
                    var hoveredComplementaryColor = view._currentAspect.ocspu.hoveredComplementaryColor;
                    var backgroundColor = view._currentAspect.ocspu.rgb;
                    var controlGroup = makeControlGroup(im, text, backgroundColor, hoveredComplementaryColor).on('dragend',
                        function () {
                            view._crossLayer.hide();
                            view._stage.draw();
                            dispatcher.trigger('update-hotspot', view._imageLayer);
                        }.bind(view))
                        .on('mousedown', function () {
                            view._crossLayer.show();
                            view._crossLayer.moveToTop();
                            view._stage.draw();
                            if (this.getAttr('trasient')) {
                                dispatcher.trigger('active-object', this);
                            }
                        })
                        .on("dragmove", function (view) {
                            return function () {
                                this.snap(view._stage.width() / 2, view._stage.height() / 2, config.MAGNET_TOLERANCE);
                            }
                        }(view))
                        .setAttr('object-type', 'text')
                        .setAttr(
                            'text-color',
                            oldControlGroup ? oldControlGroup.getAttr('text-color'): config.DEFAULT_FONT_COLOR)
                        .setAttr('font-size',
                            oldControlGroup? oldControlGroup.getAttr('font-size'): config.DEFAULT_FONT_SIZE)
                        .setAttr('font-family',
                            oldControlGroup? oldControlGroup.getAttr('font-family') : config.DEFAULT_FONT_FAMILY);

                        im.setAttr("control-group", controlGroup);

                        controlGroup.off('dblclick').on('dblclick', function (view) {
                            return function (evt) {
                                view._crossLayer.hide();
                                view._stage.draw();
                                // 之所以不用position, 是因为chrome下面position方法有bug
                                var left = controlGroup.x() - im.width() / 2 + controlGroup.getLayer().x();
                                left = Math.max(left, 0);
                                var top = controlGroup.y() - im.height() / 2 + controlGroup.getLayer().y();
                                view.$('.change-text-panel').css({
                                    left: left,
                                    top: top,
                                    position: 'absolute'
                                }).show();
                                ['.editable-region', '.object-manager', '.dashboard'].forEach(
                                    function (className) {
                                        view.$(className).block({
                                            message: null,
                                            overlayCSS: {
                                                backgroundColor: "#ccc",
                                                opacity: 0.4
                                            },
                                            baseZ: 0
                                        });
                                    });
                                    view.$('.change-text-panel textarea').val(im.name()).trigger('autosize.resize');
                                    view.$('.change-text-panel textarea').focus();
                                    view.$('.change-text-panel .btn-primary').off('click').click(function () {
                                        var text = view.$('.change-text-panel textarea').val().trim();
                                        if (!text) {
                                            alert("文字不能为空");
                                            view.$('.change-text-panel textarea').val(im.name());
                                            return false;
                                        }
                                        view.$('.change-text-panel').hide();
                                        $.ajax({
                                            type: 'POST',
                                            url: '/image/font-image',
                                            data: {
                                                text: text,
                                                'font-family': controlGroup.getAttr('font-family'),
                                                // 注意, 这里已经是生产大小了
                                                'font-size': parseInt(controlGroup.getAttr('font-size') * config.PPI / 72),
                                                'font-color': controlGroup.getAttr('text-color')
                                            },
                                            beforeSend: function () {
                                                dispatcher.trigger("mask");
                                            }
                                        }).done(function (data) {
                                            view._addText(data, text, im, controlGroup);
                                        }).fail(view._fail).always(function () {
                                            dispatcher.trigger("unmask");
                                            view.$('.editable-region ').unblock();
                                            view.$('.object-manager').unblock();
                                            view.$('.dashboard').unblock();
                                        });
                                    });
                            };
                        }(view));
                        if (oldIm && oldControlGroup) {
                            im.setZIndex(oldIm.getZIndex());
                            im.rotation(oldIm.rotation());
                            im.position(oldIm.position());
                            controlGroup.position(oldControlGroup.position());
                            controlGroup.rotation(oldControlGroup.rotation());
                            oldIm.destroy();
                            oldControlGroup.destroy();
                            dispatcher.trigger('object-added', im, controlGroup,
                                oldIm, oldControlGroup);
                            view._controlLayer.draw();
                        } else {
                            dispatcher.trigger('object-added', im, controlGroup);
                        }
                        dispatcher.trigger('active-object', controlGroup);
                        view._controlLayer.add(controlGroup).draw();
                        imageLayer.draw();
                        dispatcher.trigger('update-hotspot', view._imageLayer);
                }
            }(this));
        },
    });

    return PlayGround;
});
