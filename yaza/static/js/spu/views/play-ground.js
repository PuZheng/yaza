define(['jquery', 'underscore', 'backbone', 'handlebars', 'jszip',
'text!templates/play-ground.hbs', 'spu/config', 'spu/control-group', 
'kineticjs', 'dispatcher', 'color-tools', 
'utils/load-image', 'spu/core/interpolation', 'spu/core/mvc', 'utils/read-image-data',
'jquery.scrollTo', 'js-url', 'block-ui', 'filesaver'], 
function ($, _, Backbone, handlebars, JSZip, playGroundTemplate, config, 
makeControlGroup, Kinetic, dispatcher, colorTools, loadImage, interpolation, 
mvc, readImageData) {

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
            'click .btn-download-preview': '_downloadPreview',
            'click .btn-download-design': '_downloadDesign',
        },

        initialize: function (option) {
            this._spu = option.spu;
            this._orderId = option.orderId;
        },
        

        render: function () {
            this.$el.prepend(this._template({orderId: this._orderId}));
            this.$touchScreenEl = this.$('.touch-screen');
            this._draw = SVG(this.$('.svg-drawing')[0]);

            this._setupEventsHandler();
            this.$mask = this.$(".mask");
            this.$mask.css("line-height", this.$(".hotspot").height() + "px");
            this.$container = this.$('.editable-region');
            this._stage = new Kinetic.Stage({
                container: this.$container[0]
            });

            this._backgroundLayer = new Kinetic.Layer();
            var marginRect = new Kinetic.Rect({
                width: this._stage.width(),
                height: this._stage.height(),
                name: 'margin-rect',
            });
            this._backgroundLayer.add(marginRect);
            var aspectImageBackgroundRect = new Kinetic.Rect({
                name: 'background-rect',
            });
            this._backgroundLayer.add(aspectImageBackgroundRect);
            this._stage.add(this._backgroundLayer);

            this._aspectImageLayer = new Kinetic.Layer();
            this._stage.add(this._aspectImageLayer);

            this._designRegionAnimationLayer = new Kinetic.Layer({
                name: "design-region-animation-layer"
            });
            this._stage.add(this._designRegionAnimationLayer);

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

            var isAdministrator = !this._orderId;
            if (config.PREVIEW_DOWNLOADABLE || isAdministrator) {
                this.$('.btn-download-preview').show(); 
                this.$('.preview-background-color').show();
                this.$('.preview-background-color').spectrum({
                    allowEmpty: true,
                    color: config.DEFAULT_PREVIEW_BACKGROUND_COLOR,
                    showInput: true,
                    showAlpha: true,
                });
            }
            if (config.DESIGN_DOWNLOADABLE || isAdministrator) {
                this.$('.btn-download-design').show();
            }

            return this;
        },

        _setupEventsHandler: function () {
            this.on('aspect-selected', function (aspect) {
                console.log('aspect selected ' + aspect.name);
                this.$mask.show();
                aspect.getImage().done(function (aspect) {
                    this.$mask.hide();
                    this._setupAspectImage(aspect); 
                }.bind(this)); 
            })
            .on('design-region-selected', function (designRegion) {
                console.log('design region selected ' + designRegion.name);
                this.$mask.show();
                this._currentDesignRegion = designRegion; 
                designRegion.getPreviewEdges({
                    x: this._aspectImageLayer.width() / designRegion.aspect.size[0],
                    y: this._aspectImageLayer.height() / designRegion.aspect.size[1]
                }).done(function (previewEdges) {
                    this.$mask.hide();
                    this._designRegionAnimate(previewEdges);

                    this._currentAspect.designRegionList.forEach(function (dr) {
                        dr.getControlLayer().hide();
                    });
                    designRegion.getControlLayer().show();
                    designRegion.getControlLayer().find('.frame').size(designRegion.getControlLayer().size());
                    var controlLayer = designRegion.getControlLayer();
                    this._crossLayer.find('.vertical').points([
                        controlLayer.x() + controlLayer.width() / 2, 
                        0, 
                        controlLayer.x() + controlLayer.width() / 2, 
                        this._stage.height()
                    ]);
                    this._crossLayer.find('.horizontal').points([
                        0, 
                        controlLayer.y() + controlLayer.height() / 2,
                        this._stage.width(),
                        controlLayer.y() + controlLayer.height() / 2
                    ]);

                    dispatcher.trigger('design-region-setup', designRegion);
                    controlLayer.moveToTop();
                    controlLayer.draw();
                    if (__debug__) {
                        var layer = new Kinetic.Layer();
                        var data = [];
                        var imageLayer = designRegion.getImageLayer();
                        designRegion.controlPointsMap(imageLayer).forEach(function (pair) {
                            data.push(pair[0][0]);
                            data.push(pair[0][1]);
                            var circle = new Kinetic.Circle({
                                x: pair[0][0],
                                y: pair[0][1],
                                stroke: '#666',
                                fill: '#ddd',
                                strokeWidth: 2,
                                radius: 3
                            });
                            layer.add(circle);
                        }.bind(this));
                        data.push(data[0]);
                        data.push(data[1]);
                        var line = new Kinetic.Line({
                            points: data,
                            stroke: 'white',
                            strokeWidth: 1
                        });
                        layer.add(line);
                        var backgroundLayer = this._aspectImageLayer;
                        designRegion.controlPointsMap(imageLayer).forEach(function (pair) {
                            var points = pair[0];
                            points = points.concat([pair[1][0] + imageLayer.x() - backgroundLayer.x(), pair[1][1] + imageLayer.y() - backgroundLayer.y()]);
                            layer.add(new Kinetic.Line({
                                points: points,
                                stroke: 'yellow',
                                strokeWidth: 1,
                            }));
                        });
                        layer.position(this._aspectImageLayer.position());
                        this._stage.add(layer);
                        this._stage.draw();
                    }
                }.bind(this));
            })
            .on('design-image-selected', function (arg) {
                this._addDesignImage(arg.url, arg.title, arg.designImageId); 
            })
            .on('active-object', function (controlGroup) {
                if (!controlGroup) {
                    return;
                }
                var complementaryColor = this._currentAspect.ocspu.complementaryColor;
                var hoveredComplementaryColor = this._currentAspect.ocspu.hoveredComplementaryColor;
                controlGroup.getLayer().getChildren().forEach(function (group) {
                    if (group.nodeType == 'Group') {
                        group.hide();
                        group.find('.rect')[0].stroke(hoveredComplementaryColor);
                        group.setAttr('trasient', true);
                        group.getLayer().draw();
                    }
                });

                if (!controlGroup.getAttr('hidden')) {
                    controlGroup.show();
                }
                controlGroup.setAttr('trasient', false);

                controlGroup.find('.rect')[0].stroke(complementaryColor);
                this._activeObject = controlGroup;
                controlGroup.getLayer().draw();
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
                    case 'text':
                        im.name(val);
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
                    playGround.$('.editable-region ').unblock();
                    playGround.$('.object-manager').unblock();
                    playGround.$('.dashboard').unblock();
                }).fail(this._fail);
            }, this)
            .on('update-preview', function () {
                this._generatePreview();
            })
            .on('submit-design', function (e) {
                var ocspu = this._currentAspect.ocspu;
                if (ocspu.aspectList.every(function (aspect) {
                    return aspect.designRegionList.every(function (dr) {
                        return !dr.getImageLayer().hasChildren();
                    });                
                })) {
                    dispatcher.trigger('flash', 'error', '您尚未作出任何定制，请先定制!');
                    dispatcher.trigger('submit-design-done', 'failed');
                    return;
                }
                var data = {"data": JSON.stringify(this._getDesignData())};
                data['order_id'] = this._orderId;
                data["spu_id"] = $("[name=spu]").data("val")["id"];

                $.ajax({
                    type: 'POST',
                    url: '/image/design-save',
                    data: data
                }).done(function (content) {
                    dispatcher.trigger('flash', 'success', '您已经成功保存了定制结果');
                    dispatcher.trigger('submit-design-done', 'success');
                }).fail(function (jqXHR) {
                    dispatcher.trigger('submit-design-done', 'failed');
                });
            });
        },

        _setupAspectImage: function (aspect) {
            this._clearAspect();
            this._currentAspect = aspect;
            var imgObj = new Image();
            imgObj.crossOrigin = 'Anonymous'; // 必须在加载前就设置crossOrigin
            imgObj.onload = function (e) {
                // setup dom 
                var asPortait = aspect.size[2] / aspect.size[0] > this.$touchScreenEl.height() / this.$touchScreenEl.width();
                if (asPortait) {
                    var imageWidth = aspect.size[0] * this.$touchScreenEl.height() / aspect.size[1];
                    var imageHeight = this.$touchScreenEl.height();
                } else {
                    var imageHeight = aspect.size[1] * this.$touchScreenEl.width() / aspect.size[0];
                    var imageWidth = this.$touchScreenEl.width();
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
                    offsetX +=  Math.round((this.$touchScreenEl.width() - imageWidth) / 2);
                } else {
                    offsetY += Math.round((this.$touchScreenEl.height() - imageHeight) / 2);
                }
                this._aspectImageLayer.width(imageWidth).height(imageHeight)
                    .destroyChildren().position({
                        x: offsetX,
                        y: offsetY,
                    });
                this._backgroundLayer.find('.margin-rect')[0].fill(aspect.ocspu.marginColor);
                this._backgroundLayer.find('.background-rect')[0].fill(aspect.ocspu.paddingColor).size(this._aspectImageLayer.size()).position(this._aspectImageLayer.position());
                this._backgroundLayer.draw();
                var im = new Kinetic.Image({
                    image: e.target,
                    width: imageWidth,
                    height: imageHeight
                });
                this._aspectImageLayer.add(im);

                this._designRegionAnimationLayer.size(this._aspectImageLayer.size())
                .position(this._aspectImageLayer.position());
                this._stage.draw();

                var d = $.Deferred();

                d.progress(function (drList) {
                    return function(dr) {
                        drList.push(dr);  
                        if (drList.length == aspect.designRegionList.length) {
                            dispatcher.trigger('aspect-image-setup-done', aspect); 
                        }
                    }
                }([]));

                aspect.designRegionList.forEach(function (dr) {
                    var stage = this._stage;
                    var backgroundLayer = this._aspectImageLayer;
                    dr.previewLayer.size(backgroundLayer.size()).position(backgroundLayer.position());
                    dr.getPreviewEdges({
                        x: backgroundLayer.width() / aspect.size[0],
                        y: backgroundLayer.height() / aspect.size[1]
                    }).done(function () {
                        console.log('preview edges gotten');
                        // 找到最小的可以包住design region的框, 而且比例要和
                        // design region平铺的比例一致
                        // 当然这也隐含着一个假设， 就是design region
                        // 只能做刚体形变， 否则图片的控制框，可能包不住
                        // 预览图片.
                        // 这个框的算法是（以portrait为例）， 上边和design
                        // region的上沿对齐， 下边和design region的下沿对齐，
                        // 左边和右边到design region的左沿和右沿距离相等
                        var oldImageLayerSize = dr.getImageLayer().size();
                        if (dr.getPreviewHeight() / dr.getPreviewWidth() > dr.size[1] / dr.size[0]) {
                            // portrait
                            dr.getImageLayer().size({
                                width: Math.round(dr.size[0] * dr.getPreviewHeight() / dr.size[1]),
                                height: dr.getPreviewHeight(),
                            })
                            dr.getImageLayer().position({
                                x: Math.round(backgroundLayer.x() + dr.getPreviewLeft() - (dr.getImageLayer().width() - dr.getPreviewWidth()) / 2),
                                y: backgroundLayer.y() + dr.getPreviewBottom(),
                            });
                        } else {
                            dr.getImageLayer().size({
                                width: dr.getPreviewWidth(),
                                height: Math.round(dr.size[1] * dr.getPreviewWidth() / dr.size[0]),
                            });
                            dr.getImageLayer().position({
                                x: backgroundLayer.x() + dr.getPreviewLeft(),
                                y: Math.round(backgroundLayer.y() + dr.getPreviewBottom() - (dr.getImageLayer().height() - dr.getPreviewHeight()) / 2),
                            });
                        }
                        stage.add(dr.getImageLayer());
                        dr.getControlLayer().size(dr.getImageLayer().size()).position(dr.getImageLayer().position());
                        stage.add(dr.getControlLayer());
                        stage.add(dr.previewLayer);
                        dr.getImageLayer().moveToBottom();
                        // 添加的图像文字， 保持中心位置不变， 但是要缩放
                        if (oldImageLayerSize.width > 0 && oldImageLayerSize.height > 0) {
                            var scale = {
                                x: dr.getImageLayer().width() / oldImageLayerSize.width,
                                y: dr.getImageLayer().height() / oldImageLayerSize.height,
                            };
                            dr.getImageLayer().getChildren().forEach(function (node) {
                                node.scale(scale);
                            });
                            dr.getImageLayer().draw();
                            dr.getControlLayer().getChildren().forEach(function (node) {
                                node.scale(scale);
                            });
                            dr.getControlLayer().draw();
                        }

                        var view = this;
                        dr.getBlackShadow(backgroundLayer.width(), backgroundLayer.height())
                        .done(function () {
                            dr.getWhiteShadow(backgroundLayer.width(), backgroundLayer.height())
                            .done(function () {
                                console.log('shadow gotten');
                                view._generatePreview(dr);
                                d.notify(dr);
                            });
                        });
                    }.bind(this));
                }, this);
                


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
                var imageLayer = this._currentDesignRegion.getImageLayer();
                if (imageObj.height / imageObj.width > imageLayer.height() / imageLayer.width()) {
                    // portrait
                    var height = imageLayer.height(); 
                    var width = imageObj.width * height / imageObj.height;
                } else {
                    var width = imageLayer.width();
                    var height = imageObj.height * width / imageObj.width;
                }
                height *= config.DESIGN_IMAGE_INTIAL_ZOOMNESS;
                width *= config.DESIGN_IMAGE_INTIAL_ZOOMNESS;
                var image = new Kinetic.Image({
                    x: imageLayer.width() / 2,
                    y: imageLayer.height() / 2,
                    image: imageObj,
                    width: width,
                    height: height,
                    "design-image-id": designImageId,
                    name: title,
                    offset: {
                        x: width / 2,
                        y: height / 2
                    }
                });
                imageLayer.add(image);
                imageLayer.draw();

                var hoveredComplementaryColor = this._currentAspect.ocspu.hoveredComplementaryColor;
                var group = makeControlGroup(image, title, true, 
                hoveredComplementaryColor)
                .on('dragend', function (view) {
                    return function () {
                        view._crossLayer.hide();
                        view._crossLayer.moveToBottom();
                        view._crossLayer.draw();
                        // 注意，这里一定不能用stage.draw, 否则会清除掉其他设计区
                        // 的预览
                        view._currentDesignRegion.previewLayer.getContext()
                        .clearRect(view._aspectImageLayer.x(), 
                        view._aspectImageLayer.y(), 
                        view._aspectImageLayer.width(), 
                        view._aspectImageLayer.height());
                        view._currentDesignRegion.getImageLayer().draw();
                        if (__debug__) {
                            view._currentDesignRegion.getImageLayer().moveToTop();
                            setTimeout(function () {
                                view._currentDesignRegion.getImageLayer().moveToBottom();
                            }, 1000);
                        }
                        view._generatePreview();
                    };
                }(this))
                .on('mousedown', function () {
                    if (this.getAttr('trasient')) {
                        dispatcher.trigger('active-object', this);
                    }
                })
                .on('dragstart', function () {
                    this._crossLayer.show();
                    this._crossLayer.moveToTop();
                    this._crossLayer.draw();
                    if (config.CLEAR_PREVIEW_BEFORE_DRAG) {
                        this._currentDesignRegion.previewLayer.getContext()
                        .clearRect(this._aspectImageLayer.x(), this._aspectImageLayer.y(), 
                        this._aspectImageLayer.width(), 
                        this._aspectImageLayer.height());
                    }
                }.bind(this))
                .on("dragmove", function (view) {
                    return function () {
                        this.snap(this.getLayer().width() / 2, this.getLayer().height() / 2, config.MAGNET_TOLERANCE);
                    }
                }(this));
                image.setAttr("control-group", group);
                this._currentDesignRegion.getControlLayer().add(group).draw();
                dispatcher.trigger('object-added', image, group);
                this._generatePreview();
            }.bind(this));

        },

        _addText: function (data, text, oldIm, oldControlGroup) {
            var imageObj = new Image();
            $(imageObj).attr('src', "data:image/png;base64," + data.data).one('load', 
            function (view) {
                return function () {
                    var imageLayer = view._currentDesignRegion.getImageLayer();
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
                    imageLayer.draw();
                    var hoveredComplementaryColor = view._currentAspect.ocspu.hoveredComplementaryColor;
                    var controlGroup = makeControlGroup(im, text,
                    hoveredComplementaryColor)
                    .on('dragend', function () {
                        view._crossLayer.hide();
                        view._crossLayer.moveToBottom();
                        view._crossLayer.draw();
                        // 注意，这里一定不能用stage.draw, 否则会清除掉其他设计区
                        // 的预览
                        view._currentDesignRegion.previewLayer.getContext()
                        .clearRect(view._aspectImageLayer.x(), 
                        view._aspectImageLayer.y(), 
                        view._aspectImageLayer.width(), 
                        view._aspectImageLayer.height());
                        view._currentDesignRegion.getImageLayer().draw();
                        if (__debug__) {
                            view._currentDesignRegion.getImageLayer().moveToTop();
                            setTimeout(function () {
                                view._currentDesignRegion.getImageLayer().moveToBottom();
                            }, 1000);
                        }
                        view._generatePreview();
                    })
                    .on('mousedown', function () {
                        if (this.getAttr('trasient')) {
                            dispatcher.trigger('active-object', this);
                        }
                    })
                    .on("dragmove", function () {
                        view._crossLayer.show();
                        view._crossLayer.moveToTop();
                        view._crossLayer.draw();
                        view._currentDesignRegion.previewLayer.getContext()
                        .clearRect(view._aspectImageLayer.x(), 
                        view._aspectImageLayer.y(), 
                        view._aspectImageLayer.width(), 
                        view._aspectImageLayer.height());

                        this.snap(this.getLayer().width() / 2, this.getLayer().height() / 2, config.MAGNET_TOLERANCE);
                    })
                    .setAttr('object-type', 'text')
                    .setAttr('text-color',
                        oldControlGroup ? oldControlGroup.getAttr('text-color'): config.DEFAULT_FONT_COLOR)
                    .setAttr('font-size',
                        oldControlGroup? oldControlGroup.getAttr('font-size'): config.DEFAULT_FONT_SIZE)
                    .setAttr('font-family',
                        oldControlGroup? oldControlGroup.getAttr('font-family') : config.DEFAULT_FONT_FAMILY);

                    controlGroup.off('dblclick')
                    .on('dblclick', function (view) {
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
                                    dispatcher.trigger('text-object-changed', 'text', text);
                                });
                        };
                    }(view));
                    im.setAttr("control-group", controlGroup);
                    view._currentDesignRegion.getControlLayer().add(controlGroup).draw();
                    if (oldIm && oldControlGroup) {
                        im.setZIndex(oldIm.getZIndex());
                        im.rotation(oldIm.rotation());
                        im.position(oldIm.position());
                        controlGroup.position(oldControlGroup.position());
                        controlGroup.rotation(oldControlGroup.rotation());
                        oldIm.destroy();
                        oldControlGroup.destroy();
                        view._currentDesignRegion.getControlLayer().draw();
                        view._currentDesignRegion.getImageLayer().draw();
                        dispatcher.trigger('object-added', im, controlGroup,
                        oldIm, oldControlGroup);
                    } else {
                        dispatcher.trigger('object-added', im, controlGroup);
                    }
                    view._generatePreview();
                }
            }(this));
        },

        _generatePreview: function (designRegion) {
            !designRegion && (designRegion = this._currentDesignRegion); 
            var imageLayer = designRegion.getImageLayer();
            var previewLayer = designRegion.previewLayer;
            if (imageLayer.children.length == 0) {
                previewLayer.getContext().clearRect(previewLayer.x(), previewLayer.y(), previewLayer.width(), previewLayer.height());
                dispatcher.trigger('update-preview-done', designRegion);
                return;
            } 
            var hotspotContext = previewLayer.getContext();
            var targetWidth = this._aspectImageLayer.width();
            var targetHeight = this._aspectImageLayer.height();

            var hotspotImageData = hotspotContext.createImageData(targetWidth, targetHeight);
            this._calcImageData(hotspotImageData, imageLayer, targetWidth, targetHeight, designRegion);
            hotspotContext.imageSmoothEnabled = true;
            hotspotContext.putImageData(hotspotImageData, previewLayer.x(), previewLayer.y());
            dispatcher.trigger('update-preview-done', designRegion, previewLayer);
        },

        _calcImageData: function (imageData, imageLayer, width, height, designRegion) {
            var srcImageData = imageLayer.getContext().getImageData(imageLayer.x(), imageLayer.y(),
            imageLayer.width(), imageLayer.height()).data;

            var backgroundImageData = this._aspectImageLayer.getContext().getImageData(0, 0, width, height).data;

            var srcWidth = imageLayer.width();
            var srcHeight = imageLayer.height();
            var blackShadowImageData = designRegion.blackShadowImageData;
            var whiteShadowImageData = designRegion.whiteShadowImageData;
            var controlPointsMap = designRegion.controlPointsMap(imageLayer);
            var pointsMatrix = [
                [
                    new Array(4),
                    new Array(4),
                    new Array(4),
                    new Array(4)
                ],  // R
                [
                    new Array(4),
                    new Array(4),
                    new Array(4),
                    new Array(4)
                ], // G
                [
                    new Array(4),
                    new Array(4),
                    new Array(4),
                    new Array(4)
                ], // B
                [
                    new Array(4),
                    new Array(4),
                    new Array(4),
                    new Array(4)
                ] // A
            ];
            var rgba = this._currentAspect.ocspu.rgb.substr(1);
            rgba = [
                parseInt('0x' + rgba.substr(0, 2)),
                parseInt('0x' + rgba.substr(2, 2)),
                parseInt('0x' + rgba.substr(4, 2)),
                255
            ];

            for (var i = 0; i < width; ++i) {
                for (var j = 0; j < height; ++j) {
                    if (designRegion.within(i, j)) {
                        var origPoint = mvc([i, j], controlPointsMap);
                        interpolation.bicubicInterpolation(imageData, [i, j], width, height, srcImageData, origPoint, srcWidth, srcHeight, rgba, pointsMatrix);
                        var pos = (j * width + i) * 4;
                        if (imageData.data[pos + 3]) {
                            if (Math.max(imageData.data[pos], imageData.data[pos + 1], imageData.data[pos + 2]) > 127) {
                                var shadowImageData = blackShadowImageData;
                            } else {
                                shadowImageData = whiteShadowImageData;
                            }
                            var alpha = shadowImageData[pos + 3] / 255;
                            imageData.data[pos] = shadowImageData[pos] * alpha + imageData.data[pos] * (1 - alpha);
                            imageData.data[pos + 1] = shadowImageData[pos + 1] * alpha + imageData.data[pos + 1] * (1 - alpha);
                            imageData.data[pos + 2] = shadowImageData[pos + 2] * alpha + imageData.data[pos + 2] * (1 - alpha);
                        }
                    } 
                }
            }
            // for each point on edges, do anti alias (sampling around itself)
            designRegion.previewEdges['bottom'].forEach(function (point) {
                // 若对象已经超出边界
                if (imageData.data[(point[0] + (point[1] + 1) * width) * 4 + 4]) {
                    [
                        [point[0], point[1] + 1],
                        point,
                        [point[0], point[1] - 1],
                        [point[0] + 1, point[1] + 1],
                        [point[0] + 1, point[1]],
                        [point[0] + 1, point[1] - 1]
                        ].forEach(function (point) {
                            interpolation.edgeInterpolation(imageData, point, width, height, backgroundImageData, pointsMatrix);
                        });
                }
            });
            designRegion.previewEdges['right'].forEach(function (point) {
                if (imageData.data[(point[0] - 1 + point[1] * width) * 4 + 4]) {
                    [
                        [point[0] - 1, point[1]],
                        point,
                        [point[0] + 1, point[1]],
                        [point[0] - 1, point[1] + 1],
                        [point[0], point[1] + 1],
                        [point[0] + 1, point[1] + 1]
                        ].forEach(function (point) {
                            interpolation.edgeInterpolation(imageData, point, width, height, backgroundImageData, pointsMatrix);
                        });
                }
            });
            designRegion.previewEdges['top'].forEach(function (point) {
                if (imageData.data[(point[0] + (point[1] - 1) * width) * 4 + 4]) {
                    [
                        [point[0], point[1] - 1],
                        point,
                        [point[0], point[1] + 1],
                        [point[0] - 1, point[1] - 1],
                        [point[0] - 1, point[1]],
                        [point[0] - 1, point[1] + 1]
                        ].forEach(function (point) {
                            interpolation.edgeInterpolation(imageData, point, width, height, backgroundImageData, pointsMatrix);
                        });
                }
            });
            designRegion.previewEdges['left'].forEach(function (point) {
                if (imageData.data[(point[0] + 1 + point[1] * width) * 4 + 4]) {
                    [
                        [point[0] + 1, point[1]],
                        point,
                        [point[0] - 1, point[1]],
                        [point[0] + 1, point[1] - 1],
                        [point[0], point[1] - 1],
                        [point[0] - 1, point[1] - 1]
                        ].forEach(function (point) {
                            interpolation.edgeInterpolation(imageData, point, width, height, backgroundImageData, pointsMatrix);
                        });
                }
            });
        },

        _getDesignData: function () {
            this._draw.clear();
            var data = {};
            var ocspu = this._currentAspect.ocspu;
            ocspu.aspectList.forEach(function (asepct) {
                asepct.designRegionList.forEach(function (designRegion) {
                    var imageLayer = designRegion.getImageLayer();
                    this._draw.clear();
                    this._draw.size(designRegion.size[0] * config.PPI, designRegion.size[1] * config.PPI)
                    .data('name', name);
                    var ratio = designRegion.size[0] * config.PPI / imageLayer.width();
                    _.each(imageLayer.children, function (node) {
                        if (node.className === "Image") {
                            var im = this._draw.image(
                                readImageData.readImageDataUrl(node.image(), node.width(), node.height()),
                                node.width() * ratio,
                                node.height() * ratio)
                                .move((node.x() - node.offsetX()) * ratio, (node.y() - node.offsetY()) * ratio)
                                .rotate(node.rotation(), node.x() * ratio, node.y() * ratio);
                                if (node.image().src.match(/^http/)) {
                                    im.data("design-image-file", node.image().src)
                                }
                        }
                        data[designRegion.name] = this._draw.exportSvg({whitespace: true});
                    }, this);
                }, this);
            }, this);
            return data;
        },

        // 下载当前面的预览
        _downloadPreview: function () {
            if (this._currentAspect.designRegionList.every(function (dr) {
                return !dr.getImageLayer().hasChildren();
            })) {
                dispatcher.trigger('flash', 'error', '您尚未作出任何定制，请先定制!'); 
                return false;
            }
            var backgroundColor = this.$('input.preview-background-color').spectrum('get');
            backgroundColor = backgroundColor? backgroundColor.toRgb(): {
                r: 0, g: 0, b: 0, a: 0
            }
            var canvas = document.createElement("canvas");
            canvas.width = this._aspectImageLayer.width();
            canvas.height = this._aspectImageLayer.height();
            var ctx = canvas.getContext("2d");
            var previewImageData = ctx.createImageData(canvas.width,
            canvas.height);

            this._currentAspect.designRegionList.forEach(function (dr) {
                var previewLayer = dr.previewLayer;
                if (previewLayer) {
                    var imageData = previewLayer.getContext().getImageData(previewLayer.x(), previewLayer.y(), canvas.width, canvas.height).data;
                    var pixel = previewImageData.data.length / 4;
                    while (pixel--) {
                        previewImageData.data[pixel * 4] |= imageData[pixel * 4];
                        previewImageData.data[pixel * 4 + 1] |= imageData[pixel * 4 + 1];
                        previewImageData.data[pixel * 4 + 2] |= imageData[pixel * 4 + 2];
                        previewImageData.data[pixel * 4 + 3] |= imageData[pixel * 4 + 3];
                    }
                }
            });

            var backgroundImageData = this._aspectImageLayer.getContext()
            .getImageData(this._aspectImageLayer.x(), this._aspectImageLayer.y(), canvas.width, canvas.height).data;
            var pixel = previewImageData.data.length / 4;
            // merge the background and preview 
            while (pixel--) {
                // alpha composition, refer to `http://en.wikipedia.org/wiki/Alpha_compositing`
                if (backgroundImageData[pixel * 4 + 3] > 0) {
                    var srcA = previewImageData.data[pixel * 4 + 3] / 255;
                    var dstA = backgroundImageData[pixel * 4 + 3] / 255;
                    var outA = srcA + dstA * (1 - srcA);
                    var outR = (previewImageData.data[pixel * 4] * srcA + backgroundImageData[pixel * 4] * dstA * (1 - srcA)) / outA;
                    var outG = (previewImageData.data[pixel * 4 + 1] * srcA + backgroundImageData[pixel * 4 + 1] * dstA * (1 - srcA)) / outA;
                    var outB = (previewImageData.data[pixel * 4 + 2] * srcA + backgroundImageData[pixel * 4 + 2] * dstA * (1 - srcA)) / outA;
                    previewImageData.data[pixel * 4 + 3] = outA * 255;
                    previewImageData.data[pixel * 4] = outR;
                    previewImageData.data[pixel * 4 + 1] = outG;
                    previewImageData.data[pixel * 4 + 2] = outB;
                } 
            }
            if (backgroundColor.a > 0) {
                pixel = previewImageData.data.length / 4;
                while (pixel--) {
                    var srcA = previewImageData.data[pixel * 4 + 3] / 255;
                    var outR = (previewImageData.data[pixel * 4] * srcA + backgroundColor.r * (1 - srcA));
                    var outG = (previewImageData.data[pixel * 4 + 1] * srcA + backgroundColor.g * (1 - srcA));
                    var outB = (previewImageData.data[pixel * 4 + 2] * srcA + backgroundColor.b * (1 - srcA));
                    previewImageData.data[pixel * 4 + 3] = 255;
                    previewImageData.data[pixel * 4] = outR;
                    previewImageData.data[pixel * 4 + 1] = outG;
                    previewImageData.data[pixel * 4 + 2] = outB;
                }
            }

            ctx.putImageData(previewImageData, 0, 0);
            var uri = canvas.toDataURL('image/png');
            var a = this.$('.btn-download-preview').find('a');
            if(typeof Blob == "undefined"){
                var $form = $("#download-form");
                if(!$form[0]){
                    $form = $("<form></form>");
                }else{
                    $form.empty();
                }
                var $input = $("<input></input>").attr({"name": "data", "type":"hidden"}).val(uri);
                $form.append($input);
                $form.attr({target: "_blank", method: "POST", id: "download-form", action: "/image/image"});
                $form.appendTo($("body")).submit();
            }else{
                a.attr('href', uri).attr('download', new Date().getTime() + ".png").click(function (evt) {
                    evt.stopPropagation();
                })[0].click();
            }
        },

        _downloadDesign: function (evt) {
            if (this._currentAspect.designRegionList.every(function (dr) {
                return !dr.getImageLayer().hasChildren();
            })) {
                dispatcher.trigger('flash', 'error', '您尚未作出任何定制，请先定制!'); 
                return false;
            }
            $(evt.currentTarget).bootstrapButton('loading');

            var data = this._getDesignData();

            var zip = new JSZip();
            _.each(data, function (val, key) {
                zip.file(key + ".svg", val);
            });
            // 对于IE<10的浏览器，没有Blob对象，所以jszip不能正常的generate blob，并且，generate成base64后
            // "data:application/zip;base64," + zip.generate({type:"base64"})
            // ，其生成的链接太长，导致ie出现“传递给系统调用的数据区域太小”异常， 所以，依旧传递到后台拼装
            if (typeof Blob == "undefined") {
                var $form = $("#download-form");
                if (!$form[0]) {
                    $form = $("<form></form>");
                } else {
                    $form.empty();
                }
                var $input = $("<input></input>").attr({"name": "data", "type": "hidden"}).val(zip.generate("base64"));
                $form.append($input);
                $form.attr({target: "_blank", method: "POST", id: "download-form", action: "/image/design-pkg"});
                $form.appendTo($("body")).submit();
                $(evt.currentTarget).bootstrapButton('reset');
            } else {
                var content = zip.generate({type: "blob"});
                saveAs(content, new Date().getTime() + ".zip");
                $(evt.currentTarget).bootstrapButton('reset');
            }       
        }
    });

    return PlayGround;
});
