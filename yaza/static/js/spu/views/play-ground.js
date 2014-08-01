define(['jquery', 'backbone', 'handlebars', 'text!templates/play-ground.hbs', 'spu/config', 'kineticjs', 'dispatcher', 'color-tools', 'jquery.scrollTo', 'js-url'], function ($, Backbone, handlebars, playGroundTemplate, config, Kinetic, dispatcher, colorTools) {

    var __debug__ = ($.url('?debug') == '1');

    var PlayGround = Backbone.View.extend({
        _template: handlebars.default.compile(playGroundTemplate),

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
            });
            this.on('design-region-selected', function (designRegion) {
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
                            this._controlLayer.size(designRegion.imageLayer.size()).offset(designRegion.imageLayer.offset());
                            this._controlLayer.find('.frame')[0].size(this._controlLayer.size());
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
                            // TODO setup object manager
                            this._stage.draw();
                        }.bind(this));
                    }.bind(this));
                }.bind(this));
            })
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
                    .destroyChildren().offset({
                        x: -offsetX,
                        y: -offsetY,
                    });
                var marginRect = new Kinetic.Rect({
                    width: this._stage.width(),
                    height: this._stage.height(),
                    fill: aspect.ocspu.marginColor,
                    offsetX: offsetX,
                    offsetY: offsetY,
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
                .offset(this._backgroundLayer.offset());

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
                                });
                                dr.offset({
                                    x: backgroundLayer.offsetX() - dr.previewLeft() + (dr.imageLayer.width() - dr.previewWidth()) / 2,
                                    y: backgroundLayer.offsetY() - dr.previewBottom(),
                                });
                            } else {
                                dr.imageLayer.size({
                                    width: dr.previewWidth(),
                                    height: dr.size[1] * dr.previewWidth() / dr.size[0],
                                });
                                dr.imageLayer.offset({
                                    x: backgroundLayer.offsetX() - dr.previewLeft(),
                                    y: backgroundLayer.offsetY() - dr.previewBottom() + (dr.imageLayer.height() - dr.previewHeight()) / 2,
                                });
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

    });

    return PlayGround;
});
