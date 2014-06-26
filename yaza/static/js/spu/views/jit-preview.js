define(['linear-interpolation', 'cubic-interpolation', 'color-tools', 'config', 'buckets', 'underscore', 'backbone', 'dispatcher', 'handlebars', 'text!templates/jit-preview.hbs', 'kineticjs', 'color-tools', 'underscore.string'],
    function (bilinear, bicubic, colorTools, config, buckets, _, Backbone, dispatcher, Handlebars, jitPreviewTemplate, Kineticjs) {
        function getQueryVariable(variable) {
            var query = window.location.search.substring(1);
            var vars = query.split("&");
            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split("=");
                if (pair[0] == variable) {
                    return pair[1];
                }
            }
            return false;
        }

        var __debug__ = (getQueryVariable('debug') == '1');

        _.mixin(_.str.exports());
        Handlebars.default.registerHelper("eq", function (target, source, options) {
            if (target === source) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });

        var JitPreview = Backbone.View.extend({
                _template: Handlebars.default.compile(jitPreviewTemplate),
                _layerCache: {},

                initialize: function (options) {
                    this._spu = options.spu;
                    dispatcher.on("aspect-selected", function (aspect) {
                        var jitPreview = this;
                        console.log('aspect ' + aspect.name + ' ' + aspect.picUrl + ' selected');
                        // 切换图片时要mask
                        dispatcher.trigger('jitPreview-mask');

                        jitPreview._currentAspect = aspect;

                        // 必须使用one， 也就是说只能触发一次，否则加载新的图片，还要出发原有的handler
                        jitPreview.$('.hotspot img').attr('src', aspect.picUrl).one('load', function (evt) {
                            dispatcher.trigger('jitPreview-unmask');

                            // 其实可以不用使用本img标签,直接在backgroud layer中画,
                            // 不过这里用了一个投机取巧的办法,用浏览器帮助计算
                            // 图片的大小
                            $(this).show();  // 先显示为了正确获得图片的style
                            jitPreview.$('.design-regions').css({
                                width: $(this).width(),
                                height: $(this).height()
                            }).offset($(this).offset());
                            evt.target.crossOrigin = 'Anonymous';
                            var im = new Kinetic.Image({
                                image: evt.target,
                                width: $(this).width(),
                                height: $(this).height()
                            });
                            jitPreview._backgroundLayer = new Kinetic.Layer({
                                name: "background"
                            });
                            jitPreview._backgroundLayer.add(im).on('mouseover', function (evt) {
                                console.log('mouseover');
                                dispatcher.trigger('jitPreview-mask');
                                var hdImageObj = new Image();
                                var mouseOverEvent = evt;
                                $(hdImageObj).attr('src', jitPreview._currentAspect.hdPicUrl).one('load', function (evt) {
                                    dispatcher.trigger('jitPreview-unmask');
                                    jitPreview._backgroundLayer.hide();
                                    var im = new Kinetic.Image({
                                        image: evt.target,
                                        width: jitPreview._backgroundLayer.width() * config.MAGNIFY,
                                        height: jitPreview._backgroundLayer.height() * config.MAGNIFY
                                    });
                                    var zoomBackgroundLayer = new Kinetic.Layer({
                                        width: jitPreview._backgroundLayer.width(),
                                        height: jitPreview._backgroundLayer.height(),
                                    });
                                    zoomBackgroundLayer.on('mouseout', function () {
                                        console.log('mouseout');
                                        jitPreview._stage.find('.zoom-layer').destroy();
                                        zoomBackgroundLayer.destroy();
                                        jitPreview._backgroundLayer.show();
                                        _(jitPreview._layerCache).values().forEach(function (layer) {
                                            layer.show();
                                        });
                                    }).on('mousemove', function (evt) {
                                        // firefox has no offset[XY], chrome has both offset[XY] and layer[XY], but
                                        // layer[XY] is incorrect in chrome
                                        // 为了防止layer[XY]为0的情况, 最后必须或上一个0
                                        var x = -(evt.evt.offsetX || evt.evt.layerX || 0);
                                        var y = -(evt.evt.offsetY || evt.evt.layerY || 0);
                                        im.position({
                                            x: (config.MAGNIFY - 1) * x,
                                            y: (config.MAGNIFY - 1) * y
                                        });
                                        zoomBackgroundLayer.draw();
                                        // TODO 从效果展现上来说, 最好是在放大的图像上, 重新生成预览
                                        jitPreview._stage.find('.zoom-layer').forEach(function (zoomLayer) {
                                            var context = zoomLayer.getContext();
                                            context.imageSmoothEnabled = true;
                                            var layer = zoomLayer.getAttr('orig-layer');
                                            context.clearRect(0, 0, layer.width(), layer.height());
                                            context.drawImage(layer.getCanvas()._canvas,
                                                    -(config.MAGNIFY - 1) * x / config.MAGNIFY, -(config.MAGNIFY - 1) * y / config.MAGNIFY,
                                                    layer.width() / config.MAGNIFY, layer.height() / config.MAGNIFY,
                                                0, 0, layer.width(), layer.height());
                                        });
                                    });
                                    jitPreview._stage.add(zoomBackgroundLayer);
                                    zoomBackgroundLayer.add(im);
                                    // 必须触发mousemove操作, 因为在firefox中, mouseover不会和mousemove同时发生
                                    _(jitPreview._layerCache).values().forEach(function (layer) {
                                        layer.hide();
                                        var zoomLayer = new Kinetic.Layer({
                                            width: layer.width(),
                                            height: layer.height(),
                                            name: 'zoom-layer'
                                        });
                                        zoomLayer.setAttr('orig-layer', layer);
                                        jitPreview._stage.add(zoomLayer);
                                        zoomLayer.draw();
                                        // TODO 产生一个两倍大的不可见的layer, 在这个layer上生成了高清预览图, 用这个layer来画clip的效果图
                                    });
                                    zoomBackgroundLayer.fire('mousemove', mouseOverEvent);
                                });
                            });
                            // 若不隐藏,放大缩小浏览器的比例时,会造成本img和
                            // background layer不重叠
                            $(this).hide();

                            jitPreview._stage.getChildren(function (node) {
                                return node.getName() == "background";
                            }).forEach(function (node) {
                                node.destroy();
                            });
                            jitPreview._stage.draw();

                            jitPreview._stage.add(jitPreview._backgroundLayer);
                            jitPreview._backgroundLayer.moveToBottom();
                            jitPreview._stage.width($(this).width());
                            jitPreview._stage.height($(this).height());
                            jitPreview._stage.children.forEach(function (node) {
                                // 只改变当前面的所有layer的大小
                                if (node.nodeType === 'Layer' && node.visible()) {
                                    node.size(jitPreview._stage.size());
                                }
                            });
                            // 只有当纹理图片都加载完毕才能开始产生预览

                            var d = function () {
                                var ret = $.Deferred();
                                var l = [];
                                ret.progress(function (arg) {
                                    l.push(arg);
                                    if (l.length == 2) {
                                        // 当前已经选中了一个design region, 并且没有换面 （只是换了颜色）
                                        if (jitPreview._currentDesignRegion && jitPreview._currentDesignRegion.aspect.name == jitPreview._currentAspect.name) {
                                            $('[name="current-design-region"] a[design-region="' + jitPreview._currentDesignRegion.name + '"]').click();
                                        } else {
                                            $(_.sprintf('[name="current-design-region"] a[aspect=%s]:first', jitPreview._currentAspect.name)).click();
                                        }
                                    }
                                });
                                return ret;
                            }();
                            if (!aspect.blackShadowImageData) {
                                var blackImageObj = new Image();
                                blackImageObj.crossOrigin = "Anonymous";
                                blackImageObj.onload = function () {
                                    var canvas = document.createElement("canvas");
                                    canvas.width = jitPreview._stage.width();
                                    canvas.height = jitPreview._stage.height();
                                    var ctx = canvas.getContext("2d");
                                    ctx.drawImage(blackImageObj, 0, 0, canvas.width, canvas.height);
                                    aspect.blackShadowImageData = ctx.getImageData(0, 0, canvas.width,
                                        canvas.height).data;
                                    d.notify('black');
                                };
                                blackImageObj.src = aspect.blackShadowUrl;
                            } else {
                                d.notify('black');
                            }
                            if (!aspect.whiteShadowImageData) {
                                var whiteImageObj = new Image();
                                whiteImageObj.crossOrigin = "Anonymous";
                                whiteImageObj.onload = function () {
                                    var canvas = document.createElement("canvas");
                                    canvas.width = jitPreview._stage.width();
                                    canvas.height = jitPreview._stage.height();
                                    var ctx = canvas.getContext("2d");
                                    ctx.drawImage(whiteImageObj, 0, 0, canvas.width, canvas.height);
                                    aspect.whiteShadowImageData = ctx.getImageData(0, 0, canvas.width,
                                        canvas.height).data;
                                    d.notify('white');
                                };
                                whiteImageObj.src = aspect.whiteShadowUrl;
                            } else {
                                d.notify('white');
                            }
                        });
                    }.bind(this)).on("design-region-selected", function (designRegion) {
                        console.log("design region selected, " + designRegion.name);
                        if (!designRegion.previewEdges) {
                            designRegion.previewEdges = this._getPreviewEdges(designRegion.edges, {
                                x: this._stage.width() / designRegion.aspect.size[0],
                                y: this._stage.height() / designRegion.aspect.size[1]
                            });
                        }
                        if (!designRegion.bounds) {
                            designRegion.bounds = this._getBounds(designRegion.previewEdges);
                        }
                        var layer = this._layerCache[designRegion.id];
                        if (!layer) {
                            layer = new Kinetic.Layer();
                            this._layerCache[designRegion.id] = layer;
                            this._stage.add(layer);
                            // 没有缓存， 产生预览
                        }
                        this._currentLayer = layer;
                        this._currentDesignRegion = designRegion;
                        this._designRegionAnimate(designRegion.previewEdges);
                    }.bind(this)).on("jitPreview-mask", function () {
                        this._mask.show();
                    }.bind(this)).on("jitPreview-unmask", function () {
                        this._mask.hide();
                    }.bind(this)).on('update-hotspot', function (playGroundLayer) {
                        debugger;
                        var hotspotContext = this._currentLayer.getContext();
                        if (playGroundLayer.children.length == 0) {
                            hotspotContext.clearRect(0, 0, this._currentLayer.width(), this._currentLayer.height());
                            this._updateThumbnail(this._currentDesignRegion.aspect.id, this._currentDesignRegion.id, null);
                            if (this._currentDesignRegion) {
                                var dom = $('[name="current-design-region"] a[design-region="' + this._currentDesignRegion.name + '"]');
                                dom.removeClass("list-group-item-info");
                                dom.find("i").remove();
                            }
                            return;
                        }

                        if (this._currentDesignRegion) {
                            var dom = $('[name="current-design-region"] a[design-region="' + this._currentDesignRegion.name + '"]');
                            dom.addClass("list-group-item-info");
                            if (dom.find("i").size() == 0) {
                                dom.append(_.sprintf("<i class='fa  fa-asterisk fa-fw'></i>"))
                            }
                        }
                        this._currentLayer.draw();
                        this._currentLayer.size(this._stage.size());
                        var targetWidth = this._stage.width();
                        var targetHeight = this._stage.height();
                        var hotspotImageData = hotspotContext.createImageData(targetWidth, targetHeight);
                        var srcImageData = playGroundLayer.getContext().getImageData(playGroundLayer.x(), playGroundLayer.y(),
                            playGroundLayer.width(), playGroundLayer.height()).data;
                        var backgroundImageData = this._backgroundLayer.getContext().getImageData(0, 0, targetWidth, targetHeight).data;
                        if (!this._currentDesignRegion.controlPointsMap) {
                            this._currentDesignRegion.controlPointsMap = calcControlPoints(this._currentDesignRegion.previewEdges, playGroundLayer.size(),
                                config.CONTROL_POINT_NUM);
                        }

                        var srcWidth = playGroundLayer.width();
                        var srcHeight = playGroundLayer.height();
                        var blackShadowImageData = this._currentAspect.blackShadowImageData;
                        var whiteShadowImageData = this._currentAspect.whiteShadowImageData;
                        var controlPointsMap = this._currentDesignRegion.controlPointsMap;
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
                        var rgba = this._getCurrentRgb().substr(1);
                        rgba = [
                            parseInt('0x' + rgba.substr(0, 2)),
                            parseInt('0x' + rgba.substr(2, 2)),
                            parseInt('0x' + rgba.substr(4, 2)),
                            255
                        ];
                        for (var i = 0; i < targetWidth; ++i) {
                            for (var j = 0; j < targetHeight; ++j) {
                                if (this._within(i, j)) {
                                    var origPoint = mvc([i, j], controlPointsMap);
                                    origPos = (parseInt(origPoint[0]) +
                                        (parseInt(origPoint[1]) * srcWidth)) * 4;
                                    bicubicInterpolation(hotspotImageData, [i, j],
                                        targetWidth, targetHeight, srcImageData,
                                        origPoint, srcWidth, srcHeight, rgba, pointsMatrix);
                                    var pos = (j * targetWidth + i) * 4;
                                    if (hotspotImageData.data[pos + 3]) {
                                        if (Math.max(hotspotImageData.data[pos], hotspotImageData.data[pos + 1], hotspotImageData.data[pos + 2]) > 127) {
                                            var shadowImageData = blackShadowImageData;
                                        } else {
                                            shadowImageData = whiteShadowImageData;
                                        }
                                        var alpha = shadowImageData[pos + 3] / 255;
                                        hotspotImageData.data[pos] = shadowImageData[pos] * alpha +
                                            hotspotImageData.data[pos] * (1 - alpha);
                                        hotspotImageData.data[pos + 1] = shadowImageData[pos + 1] * alpha +
                                            hotspotImageData.data[pos + 1] * (1 - alpha);
                                        hotspotImageData.data[pos + 2] = shadowImageData[pos + 2] * alpha +
                                            hotspotImageData.data[pos + 2] * (1 - alpha);
                                    }
                                }
                            }
                        }
                        // for each point on edges, do anti alias (sampling around itself)
                        this._currentDesignRegion.previewEdges['bottom'].forEach(function (point) {
                            // 若对象已经超出边界
                            if (hotspotImageData.data[(point[0] + (point[1] + 1) * targetWidth) * 4 + 4]) {
                                [
                                    [point[0], point[1] + 1],
                                    point,
                                    [point[0], point[1] - 1],
                                    [point[0] + 1, point[1] + 1],
                                    [point[0] + 1, point[1]],
                                    [point[0] + 1, point[1] - 1]
                                ].forEach(function (point) {
                                        edgeInterpolation(hotspotImageData, point,
                                            targetWidth, targetHeight,
                                            backgroundImageData,
                                            pointsMatrix);
                                    }.bind(this));
                            }
                        });
                        this._currentDesignRegion.previewEdges['right'].forEach(function (point) {
                            if (hotspotImageData.data[(point[0] - 1 + point[1] * targetWidth) * 4 + 4]) {
                                [
                                    [point[0] - 1, point[1]],
                                    point,
                                    [point[0] + 1, point[1]],
                                    [point[0] - 1, point[1] + 1],
                                    [point[0], point[1] + 1],
                                    [point[0] + 1, point[1] + 1]
                                ].forEach(function (point) {
                                        edgeInterpolation(hotspotImageData, point,
                                            targetWidth, targetHeight, backgroundImageData,
                                            pointsMatrix);
                                    }.bind(this));
                            }
                        });
                        this._currentDesignRegion.previewEdges['top'].forEach(function (point) {
                            if (hotspotImageData.data[(point[0] + (point[1] - 1) * targetWidth) * 4 + 4]) {
                                [
                                    [point[0], point[1] - 1],
                                    point,
                                    [point[0], point[1] + 1],
                                    [point[0] - 1, point[1] - 1],
                                    [point[0] - 1, point[1]],
                                    [point[0] - 1, point[1] + 1]
                                ].forEach(function (point) {
                                        edgeInterpolation(hotspotImageData, point,
                                            targetWidth, targetHeight, backgroundImageData,
                                            pointsMatrix);
                                    }.bind(this));
                            }
                        });
                        this._currentDesignRegion.previewEdges['left'].forEach(function (point) {
                            if (hotspotImageData.data[(point[0] + 1 + point[1] * targetWidth) * 4 + 4]) {
                                [
                                    [point[0] + 1, point[1]],
                                    point,
                                    [point[0] - 1, point[1]],
                                    [point[0] + 1, point[1] - 1],
                                    [point[0], point[1] - 1],
                                    [point[0] - 1, point[1] - 1]
                                ].forEach(function (point) {
                                        edgeInterpolation(hotspotImageData, point,
                                            targetWidth, targetHeight, backgroundImageData,
                                            pointsMatrix);
                                    }.bind(this));
                            }
                        });
                        if (__debug__) {
                            var layer = new Kinetic.Layer();
                            var data = [];
                            this._currentDesignRegion.controlPointsMap.forEach(function (pair) {
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
                            this._stage.add(layer);
                            this._stage.draw();
                        }
                        hotspotContext.imageSmoothEnabled = true;
                        hotspotContext.putImageData(hotspotImageData, 0, 0);
                        this._updateThumbnail(this._currentDesignRegion.aspect.id, this._currentDesignRegion.id, hotspotContext.getCanvas()._canvas);
                    }.bind(this));
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

                _designRegionAnimate: function (edges) {
                    var jitPreview = this;
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

                    jitPreview._designRegionAnimationLayer.add(designRegionHex);

                    var period = 2000;

                    jitPreview._colorTrans(designRegionHex, period / 100);
                    designRegionHex.transIn();
                },

                events: {
                    'click .ocspu-selector .thumbnail': function (evt) {
                        this.$(".ocspu-selector .thumbnail").removeClass("selected");
                        $(evt.currentTarget).addClass("selected");
                        var ocspu = $(evt.currentTarget).data('ocspu');
                        // 删除已有的上次所有designRegion的canvas
                        if (this._currentAspect) {
                            var layerCache = this._layerCache;
                            this._currentAspect.designRegionList.forEach(function (designRegion) {
                                var layer = layerCache[designRegion.id];
                                if (layer) {
                                    layer.destroy();
                                }
                            });
                        }

                        dispatcher.trigger('ocspu-selected', ocspu);
                    },
                    'click .btn-save': function (evt) {
                        dispatcher.trigger("design-save", evt);
                    },

                    'click .btn-download': function (evt) {
                        dispatcher.trigger("design-download", evt);
                    }
                },

                render: function () {
                    this.$el.append(this._template({spu: this._spu}));
                    this._stage = new Kinetic.Stage({
                        container: this.$('.design-regions')[0]
                    });
                    this._designRegionAnimationLayer = new Kinetic.Layer();
                    this._stage.add(this._designRegionAnimationLayer);

                    this._mask = this.$(".mask");
                    this._mask.css("line-height", this.$(".hotspot").height() + "px");
                    this._mask.hide();
                    if (config.DOWNLOADABLE) {
                        this.$("button.btn-download").show();
                    } else {
                        this.$("button.btn-download").hide();
                    }
                    this.$('.ocspu-selector .thumbnail').each(function (idx, e) {
                        $(e).data('ocspu', this._spu.ocspuList[idx]);
                    }.bind(this));

                    this.$('.ocspu-selector .thumbnail:first-child').click();
                },


                _updateThumbnail: function (aspectId, designRegionId, canvasElement) {
                    var aspectElement = $('[data-aspectId=' + aspectId + "]");
                    var designRegionName = "design-region-" + designRegionId;
                    var stage = aspectElement.data("stage");
                    if (!stage) {
                        if (canvasElement === null) {
                            return;
                        }
                        var div = $("<div></div>").addClass("layer");
                        aspectElement.before(div);
                        stage = new Kinetic.Stage({
                            container: div[0],
                            width: aspectElement.width(),
                            height: aspectElement.height()
                        });
                        aspectElement.data("stage", stage);
                    }
                    stage.getChildren(function (node) {
                        return node.getName() == designRegionName;
                    }).forEach(function (node) {
                        node.destroy();
                    });
                    if (canvasElement) {
                        var layer = new Kineticjs.Layer({
                            name: designRegionName
                        });
                        stage.add(layer);
                        layer.draw();
                        var thumbnailContext = layer.getContext();
                        thumbnailContext.imageSmoothEnabled = false;
                        thumbnailContext.drawImage(canvasElement, 0, 0, aspectElement.width(), aspectElement.height());
                    }
                },

                _getPreviewEdges: function (edges, ratio) {
                    var ret = {};
                    // 这里必须要去重，否则边界计算错误
                    // 而且需要注意的是， 缩放过的线段可能会产生锯齿.
                    // 比如一种典型的情况是： top上， 有两个点x一样， y相邻,
                    // 这样会给判断点是否在边界上带来麻烦
                    var set = new buckets.Set();
                    ['top', 'left', 'bottom', 'right'].forEach(function (position) {
                        ret[position] = [];
                        edges[position].forEach(function (point) {
                            var p = [Math.round(point[0] * ratio.x), Math.round(point[1] * ratio.y)];
                            if (!set.contains(p)) {
                                set.add(p);
                                ret[position].push(p);
                            }
                        });
                    });
                    return ret;
                },

                _getEdgeSet: function (edges) {
                    var edgeSet = new buckets.Set();
                    edges['left'].forEach(function (p) {
                        edgeSet.add(p);
                    });
                    edges['right'].forEach(function (p) {
                        edgeSet.add(p);
                    });
                    edges['top'].forEach(function (p) {
                        edgeSet.add(p);
                    });
                    edges['bottom'].forEach(function (p) {
                        edgeSet.add(p);
                    });
                    return edgeSet;
                },

                _getCurrentRgb: function () {
                    return this.$('.ocspu-selector .thumbnail.selected').data('ocspu').rgb;
                },

                _getBounds: function (edges) {
                    // 注意, 投射区域中, 不是说top边上的任何一个点都在left的右边, 也不是
                    // 都在bottom的上面. 这里唯一要求的是, 这四个边组成了一个封闭区域.
                    // 那么我们就要将四个边放在一起考虑, 给定任何一个y, 左右边界是什么,
                    // 给定任何一个x, 上下边界是什么
                    var ret = {
                        leftRight: {},
                        topBottom: {}
                    };
                    ['top', 'right', 'bottom', 'left'].forEach(function (edgeName) {
                        edges[edgeName].forEach(function (point) {
                            if (ret.topBottom[point[0]]) {
                                ret.topBottom[point[0]].push(point[1]);
                            } else {
                                ret.topBottom[point[0]] = [point[1]];
                            }
                            if (ret.leftRight[point[1]]) {
                                ret.leftRight[point[1]].push(point[0]);
                            } else {
                                ret.leftRight[point[1]] = [point[0]];
                            }
                        });
                    });

                    for (var x in ret.topBottom) {
                        ret.topBottom[x] = {
                            bottom: Math.min.apply(Math, ret.topBottom[x]),
                            top: Math.max.apply(Math, ret.topBottom[x]),
                            innerPoints: ret.topBottom[x].sort().slice(1, -1)
                        }
                    }
                    for (var y in ret.leftRight) {
                        ret.leftRight[y] = {
                            left: Math.min.apply(Math, ret.leftRight[y]),
                            right: Math.max.apply(Math, ret.leftRight[y]),
                            innerPoints: ret.leftRight[y].sort().slice(1, -1)
                        };
                    }
                    return ret;
                },

// 测试一个点是否在边界内
                _within: function (x, y) {
                    var test = 0;
                    var leftRight = this._currentDesignRegion.bounds.leftRight[y];
                    var topBottom = this._currentDesignRegion.bounds.topBottom[x];
                    if (!(leftRight && topBottom)) {
                        return false;
                    }
                    // 必须在四个边界中
                    test += (x > leftRight.left);
                    test += (x < leftRight.right);
                    test += (y > topBottom.bottom);
                    test += (y < topBottom.top);
                    // 必须不能在边界上
                    return test == 4 && !leftRight.innerPoints.some(function (x_) {
                        return x_ == x;
                    }) && !topBottom.innerPoints.some(function (y_) {
                        return y_ == y;
                    });
                }
            })
            ;

        function getCos(p, p1, p2) {
            var a = Math.pow(p1[0] - p[0], 2) + Math.pow(p1[1] - p[1], 2);
            var b = Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2);
            var c = Math.pow(p2[0] - p[0], 2) + Math.pow(p2[1] - p[1], 2);
            return (a + c - b) / (2 * Math.sqrt(a) * Math.sqrt(c));
        }

        function mvc(point, cpPairs) {
            var cpPairsLen = cpPairs.length;

            var weights = [];
            var cp0, cp1, cp2, cos0, cos1, tan0, tan1, w;
            for (var i = 0; i < cpPairsLen; ++i) {
                cp0 = cpPairs[(i - 1 + cpPairsLen) % cpPairsLen][0];
                cp1 = cpPairs[i][0];
                cp2 = cpPairs[(i + 1) % cpPairsLen][0];

                cos0 = getCos(point, cp0, cp1);
                if (cos0 + 1 <= 0) {
                    // avoid 180 degree
                    cos0 = -0.99;
                }
                if (cos0 > 1) {
                    cos0 = 1;
                }
                cos1 = getCos(point, cp1, cp2);
                if (cos1 + 1 <= 0) {
                    cos1 = -0.99;
                }
                if (cos1 > 1) {
                    // avoid 180 degree
                    cos1 = 1;
                }
                tan0 = Math.sqrt((1.0 - cos0) / (1.0 + cos0));
                tan1 = Math.sqrt((1.0 - cos1) / (1.0 + cos1));
                w = (tan0 + tan1) / Math.sqrt(Math.pow(cp1[0] - point[0], 2) + Math.pow(cp1[1] - point[1], 2));
                if (isNaN(w) || !isFinite(w)) {
                    w = 0;
                }
                weights.push(w);
            }

            var x = 0.0;
            var y = 0.0;
            var weights_sum = weights.reduce(function (a, b) {
                return a + b;
            }, 0);
            for (var i = 0; i < cpPairsLen; ++i) {
                x += weights[i] * cpPairs[i][1][0];
                y += weights[i] * cpPairs[i][1][1];
            }
            return [x / weights_sum, y / weights_sum];
        }

        function calcControlPoints(edges, size, cpNum) {
            var cpMap = [];
            var width = size.width;
            var height = size.height;
            // top
            var step1 = edges['top'].length / (cpNum[0] - 1);
            var step2 = width / (cpNum[0] - 1);
            // anchor the top right corner
            var top = _.clone(edges['top']).reverse();
            cpMap.push([top[top.length - 1], [width - 1, height - 1]]);
            // note! we omit the top left corner
            for (var i = cpNum[0] - 2; i > 0; --i) {
                cpMap.push([
                    top[parseInt(Math.round(i * step1))],
                    [parseInt(Math.round(i * step2)), height - 1]
                ]);
            }

            // left
            var step1 = edges['left'].length / (cpNum[1] - 1);
            var step2 = height / (cpNum[1] - 1);
            // anchor the top left corner
            var left = _.clone(edges['left']).reverse();
            cpMap.push([left[left.length - 1], [0, height - 1]]);
            for (var i = cpNum[1] - 2; i > 0; --i) {
                cpMap.push([
                    left[parseInt(Math.round(i * step1))],
                    [0, parseInt(Math.round(i * step2))]
                ]);
            }

            // bottom
            var step1 = edges['bottom'].length / (cpNum[0] - 1);
            var step2 = width / (cpNum[0] - 1);
            var bottom = edges['bottom'];
            // anchor the left bottom corner
            cpMap.push([bottom[0], [0, 0]]);
            for (var i = 1; i < cpNum[0] - 1; ++i) {
                cpMap.push([
                    bottom[parseInt(Math.round(i * step1))],
                    [parseInt(Math.round(i * step2)), 0]
                ]);
            }

            // right
            var step1 = edges['right'].length / (cpNum[1] - 1);
            var step2 = height / (cpNum[1] - 1);
            var right = edges['right'];
            // anchor the bottom right corner
            cpMap.push([right[0], [width - 1, 0]]);
            for (var i = 1; i < cpNum[1] - 1; ++i) {
                cpMap.push([
                    right[parseInt(Math.round(i * step1))],
                    [width - 1, parseInt(Math.round(i * step2))]
                ]);
            }
            return cpMap;
        }

        function composeBilinearMatrix(point, srcImageData, srcWidth, offset) {
            var x0 = Math.floor(point[0]);
            var y0 = Math.floor(point[1]);
            var pos0 = (x0 + y0 * srcWidth) * 4 + offset;

            return [
                [srcImageData[pos0], srcImageData[pos0 + 4]],
                [srcImageData[pos0 + srcWidth * 4], srcImageData[pos0 + (srcWidth + 1) * 4]]
            ];
        }


        function composeBicubicMatrix(left, bottom, srcImageData, srcWidth, srcHeight, backgroundColor, ret) {
            var pos0 = (left + bottom * srcWidth) * 4;
            // 在大多数情况下， 点不会在边界上
            if (left > 0 && left + 3 < srcWidth && bottom > 0 && bottom + 3 < srcHeight) {
                for (var i = 0; i < 4; ++i) {
                    for (var j = 0; j < 4; ++j) {
                        for (var k = 0; k < 4; ++k) {
                            ret[i][j][k] = srcImageData[pos0 + (j * srcWidth + k) * 4 + i];
                        }
                    }
                }
                return ret;
            }

            // 第一行， 需要考虑left在边界外， bottom在边界外， left+3在边界外的情况
            if (left < 0 || bottom < 0) {
                for (var offset = 0; offset < 4; ++offset) {
                    ret[offset][0][0] = backgroundColor[offset];
                }
            } else {
                for (var offset = 0; offset < 4; ++offset) {
                    ret[offset][0][0] = srcImageData[pos0 + offset];
                }
            }

            if (bottom < 0) {
                for (var offset = 0; offset < 4; ++offset) {
                    ret[offset][0][1] = backgroundColor[offset];
                    ret[offset][0][2] = backgroundColor[offset];
                }
            } else {
                for (var offset = 0; offset < 4; ++offset) {
                    ret[offset][0][1] = srcImageData[pos0 + 4 + offset];
                    ret[offset][0][2] = srcImageData[pos0 + 8 + offset]
                }
            }

            if (left + 3 >= srcWidth || bottom < 0) {
                for (var offset = 0; offset < 4; ++offset) {
                    ret[offset][0][3] = backgroundColor[offset];
                }
            } else {
                for (var offset = 0; offset < 4; ++offset) {
                    ret[offset][0][3] = srcImageData[pos0 + 12 + offset];
                }
            }

            // 第2, 3行， 需要考虑left在边界外, left + 3在边界外

            var pos1 = pos0 + srcWidth * 4;
            var pos2 = pos1 + srcWidth * 4;
            if (left < 0) {
                for (var offset = 0; offset < 4; ++offset) {
                    ret[offset][1][0] = backgroundColor[offset];
                    ret[offset][2][0] = backgroundColor[offset];
                }
            } else {
                for (var offset = 0; offset < 4; ++offset) {
                    ret[offset][1][0] = srcImageData[pos1 + offset];
                    ret[offset][2][0] = srcImageData[pos2 + offset];
                }
            }
            for (var offset = 0; offset < 4; ++offset) {
                ret[offset][1][1] = srcImageData[pos1 + 4 + offset];
                ret[offset][1][2] = srcImageData[pos1 + 8 + offset]
                ret[offset][2][1] = srcImageData[pos2 + 4 + offset];
                ret[offset][2][2] = srcImageData[pos2 + 8 + offset]
            }
            if (left + 3 >= srcWidth) {
                for (var offset = 0; offset < 4; ++offset) {
                    ret[offset][1][3] = backgroundColor[offset];
                    ret[offset][2][3] = backgroundColor[offset];
                }
            } else {
                for (var offset = 0; offset < 4; ++offset) {
                    ret[offset][1][3] = srcImageData[pos1 + 12 + offset];
                    ret[offset][2][3] = srcImageData[pos2 + 12 + offset];
                }
            }

            // 第4行， 需要考虑left在边界外， bottom + 3在边界外， left+3在边界外的情况
            var pos3 = pos2 + srcWidth * 4;
            if (left < 0 || bottom + 3 >= srcHeight) {
                for (var offset = 0; offset < 4; ++offset) {
                    ret[offset][3][0] = backgroundColor[offset];
                }
            } else {
                for (var offset = 0; offset < 4; ++offset) {
                    ret[offset][3][0] = srcImageData[pos3 + offset];
                }
            }

            if (bottom + 3 >= srcHeight) {
                for (var offset = 0; offset < 4; ++offset) {
                    ret[offset][3][1] = backgroundColor[offset];
                    ret[offset][3][2] = backgroundColor[offset];
                }
            } else {
                for (var offset = 0; offset < 4; ++offset) {
                    ret[offset][3][1] = srcImageData[pos3 + 4 + offset];
                    ret[offset][3][2] = srcImageData[pos3 + 8 + offset]
                }
            }

            if (left + 3 >= srcWidth || bottom + 3 >= srcHeight) {
                for (var offset = 0; offset < 4; ++offset) {
                    ret[offset][3][3] = backgroundColor[offset];
                }
            } else {
                for (var offset = 0; offset < 4; ++offset) {
                    ret[offset][3][3] = srcImageData[pos3 + 12 + offset];
                }
            }

            return ret;
        }

        function bicubicInterpolation(destImageData, destPoint, destWidth, destHeight, srcImageData, srcPoint, srcWidth, srcHeight, backgrounColor, pointsMatrix) {
            // find the 16 points
            var pos = (destPoint[0] + destPoint[1] * destWidth) * 4;

            var left = Math.floor(srcPoint[0]) - 1;
            var bottom = Math.floor(srcPoint[1]) - 1;

            var x = srcPoint[0] - Math.floor(srcPoint[0]);
            var y = srcPoint[1] - Math.floor(srcPoint[1]);
            composeBicubicMatrix(left, bottom, srcImageData, srcWidth, srcHeight, backgrounColor, pointsMatrix);
            destImageData.data[pos + 3] = bicubic(pointsMatrix[3], x, y);
            if (destImageData.data[pos + 3] == 0) {
                return;
            }
            destImageData.data[pos] = bicubic(pointsMatrix[0], x, y);
            destImageData.data[pos + 1] = bicubic(pointsMatrix[1], x, y);
            destImageData.data[pos + 2] = bicubic(pointsMatrix[2], x, y);
        }

        function composeEdgeMatrix(left, bottom, imageData, srcWidth, srcHeight, complementImageData, ret) {
            // 若是发现某个点是透明的， 拿背景图去填
            var pos0 = (left + bottom * srcWidth) * 4;
            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    if ((ret[3][i][j] = imageData[pos0 + (i * srcWidth + j) * 4 + 3]) != 0) {
                        ret[0][i][j] = imageData[pos0 + (i * srcWidth + j) * 4];
                        ret[1][i][j] = imageData[pos0 + (i * srcWidth + j) * 4 + 1];
                        ret[2][i][j] = imageData[pos0 + (i * srcWidth + j) * 4 + 2];
                    } else {
                        ret[0][i][j] = complementImageData[pos0 + (i * srcWidth + j) * 4];
                        ret[1][i][j] = complementImageData[pos0 + (i * srcWidth + j) * 4 + 1];
                        ret[2][i][j] = complementImageData[pos0 + (i * srcWidth + j) * 4 + 2];
                        ret[3][i][j] = complementImageData[pos0 + (i * srcWidth + j) * 4 + 3];
                    }
                }
            }
            return ret;

        }

        function edgeInterpolation(imageData, point, width, height, backgroundImageData, pointsMatrix) {
            var pos = (point[0] + point[1] * width) * 4;

            var left = point[0] - 1;
            var bottom = point[1] - 1;

            composeEdgeMatrix(left, bottom, imageData.data, width, height, backgroundImageData, pointsMatrix);
            // 不知道为什么bicubic效果很差
            imageData.data[pos + 3] = bilinear(pointsMatrix[3]);
            if (imageData.data[pos + 3] == 0) {
                return;
            }
            imageData.data[pos] = bilinear(pointsMatrix[0]);
            imageData.data[pos + 1] = bilinear(pointsMatrix[1]);
            imageData.data[pos + 2] = bilinear(pointsMatrix[2]);
            console.log(imageData.data[pos] + ' ' +
                imageData.data[pos + 1] + ' ' +
                imageData.data[pos + 2] + ' ' +
                imageData.data[pos + 3]);
        }

        return JitPreview;
    })
;
