define(['buckets', 'underscore', 'backbone', 'dispatcher', 'handlebars', 'text!templates/jit-preview.hbs', 'kineticjs', 'color-tools', 'underscore.string'],
    function (buckets, _, Backbone, dispatcher, Handlebars, jitPreviewTemplate, Kineticjs) {
        function getQueryVariable(variable) {
            var query = window.location.search.substring(1);
            var vars = query.split("&");
            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split("=");
                if (pair[0] == variable) {
                    return pair[1];
                }
            }
            return(false);
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
            },

            _colorTrans: function (obj, period) {
                obj._colors = ColorGrads(['red', "#FFF"], 20);

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
                    name: 'highlight-frame',
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
                    // show aspects
                    this.$('.aspect-selector').empty();
                    var ocspu = $(evt.currentTarget).data('ocspu');
                    if (!ocspu.complementaryColor) {
                        ocspu.complementaryColor = ComplementaryColors(ocspu.rgb);
                        console.log(ocspu.rgb + " - " + ocspu.complementaryColor);
                    }
                    dispatcher.trigger('ocspu-selected', ocspu);
                    var designRegions = this.$('[name="current-design-region"]');
                    designRegions.find('a').each(function () {
                        var layer = $(this).data('layer');
                        layer.destroy();
                    });
                    designRegions.empty();

                    ocspu.aspectList.forEach(function (aspect) {
                        $(_.sprintf('<div class="thumbnail"><img src="%s" alt="%s" title="%s" data-aspectID="%s"/></div>',
                            aspect.thumbnail, aspect.name, aspect.name, aspect.id)).appendTo(this.$('.aspect-selector')).data('aspect', aspect);

                        aspect.designRegionList.forEach(function (designRegion) {
                            designRegion.aspect = aspect;
                            var layer = this._layerCache[designRegion.id];
                            if (!layer) {
                                layer = new Kinetic.Layer();
                                this._layerCache[designRegion.id] = layer;
                                this._stage.add(layer);
                                // 没有缓存， 产生预览
                            } else {
                                this._stage.add(layer);
                            }
                            $(_.sprintf("<a href='#' class='list-group-item btn btn-default' aspect='%s' design-region='%s'>%s - %s</a>", aspect.name, designRegion.name, aspect.name, designRegion.name)
                            ).data('design-region', designRegion).data("aspect", aspect).data('layer', layer).appendTo(designRegions);
                        }.bind(this));
                    }.bind(this));
                    if (!this._currentAspect) {
                        this.$('.aspect-selector .thumbnail:first-child').click();
                    } else {
                        // 切换ocspu的时候，不切换面
                        this.$(_.sprintf('.aspect-selector .thumbnail img[title="%s"]', this._currentAspect.name)).parent().click();
                    }
                },
                'click .aspect-selector .thumbnail': function (evt) {
                    this.$(".aspect-selector .thumbnail").removeClass("selected");
                    $(evt.currentTarget).addClass("selected");
                    var aspect = $(evt.currentTarget).data('aspect');
                    this._currentAspect = aspect;
                    // 必须使用one， 也就是说只能触发一次，否则加载新的图片，还要出发原有的handler
                    this.$('.hotspot img').attr('src', aspect.picUrl).one('load',
                        function (jitPreview, aspect) {
                            return function (evt) {
                                // 其实可以不用使用本img标签,直接在backgroud layer中画,
                                // 不过这里用了一个投机取巧的办法,用浏览器帮助计算
                                // 图片的大小
                                $(this).show();
                                jitPreview.$('.design-regions').css({
                                    width: $(this).width(),
                                    height: $(this).height()
                                }).offset($(this).offset());
                                var im = new Kinetic.Image({
                                    image: evt.target,
                                    width: $(this).width(),
                                    height: $(this).height()
                                });
                                jitPreview._backgroundLayer = new Kinetic.Layer({
                                    name: "background"
                                });
                                jitPreview._backgroundLayer.add(im);
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
                                if (jitPreview._currentDesignRegion && jitPreview._currentDesignRegion.aspect == jitPreview._currentAspect) {
                                    jitPreview.$('[name="current-design-region"] a[design-region="' + jitPreview._currentDesignRegion.name + '"]').click();
                                } else if (!jitPreview._currentAspect) {
                                    jitPreview.$('[name="current-design-region"] a:first').click();
                                } else {
                                    jitPreview.$(_.sprintf('[name="current-design-region"] a[aspect=%s]:first', jitPreview._currentAspect.name)).click();
                                }
                            }
                        }(this, aspect));
                    this.$('[name="current-design-region"] a').off("click").click(
                        function (jitPreview) {
                            return function () {

                                $('[name="current-design-region"] a').removeClass("disabled active");
                                $(this).addClass("active disabled");
                                var designRegion = $(this).data("design-region");
                                jitPreview._currentDesignRegion = designRegion;

                                if (jitPreview._currentAspect != $(this).data("aspect")) {
                                    jitPreview.$(_.sprintf('.aspect-selector .thumbnail img[title="%s"]', $(this).data("aspect").name)).parent().click();
                                    return;
                                }


                                if (!designRegion.previewEdges) {
                                    designRegion.previewEdges = jitPreview._getPreviewEdges(designRegion.edges, {
                                        x: jitPreview._stage.width() / aspect.size[0],
                                        y: jitPreview._stage.height() / aspect.size[1],
                                    });
                                }
                                if (!designRegion.bounds) {
                                    designRegion.bounds = jitPreview._getBounds(designRegion.previewEdges);
                                }
                                jitPreview._currentLayer = $(this).data('layer');

                                jitPreview._designRegionAnimate(designRegion.previewEdges);
                                console.log('ok');
                                dispatcher.trigger('design-region-selected', designRegion);
                            }
                        }(this));
                }
            },

            render: function () {
                this.$el.append(this._template({spu: this._spu}));
                this._stage = new Kinetic.Stage({
                    container: this.$('.design-regions')[0]
                });
                this._designRegionAnimationLayer = new Kinetic.Layer();
                this._stage.add(this._designRegionAnimationLayer);

                this.$('.ocspu-selector .thumbnail').each(function (idx, e) {
                    $(e).data('ocspu', this._spu.ocspuList[idx]);
                }.bind(this));
                this.$('.ocspu-selector .thumbnail:first-child').click();

                this._mask = this.$(".mask");
                this._mask.css("line-height", this.$(".hotspot").height() + "px");
                this._mask.hide();
                dispatcher.on("jitPreview-mask", function () {
                        this._mask.show();
                    }.bind(this)).on("jitPreview-unmask", function () {
                        this._mask.hide();
                    }.bind(this)).on('update-hotspot', function (playGroundLayer) {
                        var hotspotContext = this._currentLayer.getContext();
                        if (playGroundLayer.children.length == 0) {
                            hotspotContext.clearRect(0, 0, this._currentLayer.width(), this._currentLayer.height());
                            this._updateThumbnail(this._currentDesignRegion.aspect.id, this._currentDesignRegion.id, null);
                            if (this._currentDesignRegion) {
                                var dom = this.$('[name="current-design-region"] a[design-region="' + this._currentDesignRegion.name + '"]');
                                dom.removeClass("list-group-item-info");
                                dom.find("i").remove();
                            }
                            return;
                        }

                        if (this._currentDesignRegion) {
                            var dom = this.$('[name="current-design-region"] a[design-region="' + this._currentDesignRegion.name + '"]');
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
                        var srcImageData = playGroundLayer.getContext().getImageData(0, 0,
                            playGroundLayer.width(), playGroundLayer.height()).data;
                        var backgroundImageData = this._backgroundLayer.getContext().getImageData(0, 0, this._backgroundLayer.width(), this._backgroundLayer.height()).data;
                        if (!this._currentDesignRegion.controlPointsMap) {
                            this._currentDesignRegion.controlPointsMap = calcControlPoints(this._currentDesignRegion.previewEdges, playGroundLayer.size(),
                                [4, 4]);
                        }

                        var srcWidth = playGroundLayer.width();
                        var srcHeight = playGroundLayer.height();
                        var delta1 = 10;
                        var delta2 = -5;
                        var test1 = Math.min(this._currentDesignRegion.medianHSVValue + delta1,
                            this._currentDesignRegion.maxHSVValue);
                        var test2 = this._currentDesignRegion.medianHSVValue - delta2;
                        for (var i = 0; i < targetWidth; ++i) {
                            for (var j = 0; j < targetHeight; ++j) {
                                if (this._within(i, j)) {
                                    var origPoint = mvc([i, j], this._currentDesignRegion.controlPointsMap);
                                    var pos = (i + j * targetWidth) * 4;
                                    origPos = (origPoint[0] + (origPoint[1] * srcWidth)) * 4;
                                    var v = getHSVValue(backgroundImageData, pos, srcImageData,
                                        origPos, test1, test2);

                                    hotspotImageData.data[pos] = Math.min(srcImageData[origPos] + v, 255);
                                    hotspotImageData.data[pos + 1] = Math.min(srcImageData[origPos + 1] + v, 255);
                                    hotspotImageData.data[pos + 2] = Math.min(srcImageData[origPos + 2] + v, 255);
                                    hotspotImageData.data[pos + 3] = srcImageData[origPos + 3];

                                }
                            }
                        }
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
                                    radius: 3,
                                });
                                layer.add(circle);
                            }.bind(this));
                            data.push(data[0]);
                            data.push(data[1]);
                            var line = new Kinetic.Line({
                                points: data,
                                stroke: 'white',
                                strokeWidth: 1,
                            });
                            layer.add(line);
                            this._stage.add(layer);
                            this._stage.draw();
                        }
                        hotspotContext.putImageData(hotspotImageData, 0, 0);
                        this._updateThumbnail(this._currentDesignRegion.aspect.id, this._currentDesignRegion.id, hotspotContext.getCanvas()._canvas);
                    }.bind(this));
            },


            _updateThumbnail: function (aspectId, designRegionId, canvasElement) {
                var aspectElement = this.$('[data-aspectId=' + aspectId + "]");
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

            _getBounds: function (edges) {
                var ret = {
                    leftRight: {},
                    topBottom: {},
                };
                edges['bottom'].forEach(function (point) {
                    ret.topBottom[point[0]] = {
                        bottom: point[1],
                        top: Number.MIN_VALUE,
                    };
                });
                edges['top'].forEach(function (point) {
                    if (!!ret.topBottom[point[0]]) {
                        ret.topBottom[point[0]].top = point[1];
                    } else {
                        ret.topBottom[point[0]] = {
                            bottom: Number.MAX_VALUE,
                            top: point[1],
                        }
                    }
                });
                edges['left'].forEach(function (point) {
                    ret.leftRight[point[1]] = {
                        left: point[0],
                        right: Number.MIN_VALUE,
                    };
                });
                edges['right'].forEach(function (point) {
                    if (!!ret.leftRight[point[1]]) {
                        ret.leftRight[point[1]].right = point[0];
                    } else {
                        ret.leftRight[point[1]] = {
                            left: Number.MAX_VALUE,
                            right: point[0],
                        }
                    }
                });
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
                test += (x >= leftRight.left);
                test += (x <= leftRight.right);
                test += (y >= topBottom.bottom);
                test += (y <= topBottom.top);
                return test >= 3;
            },
        });

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
                cos1 = getCos(point, cp1, cp2);
                tan0 = Math.sqrt((1.0 - cos0) / (1.0 + cos0));
                tan1 = Math.sqrt((1.0 - cos1) / (1.0 + cos1));
                w = (tan0 + tan1) / Math.sqrt(Math.pow(cp1[0] - point[0], 2) + Math.pow(cp1[1] - point[1], 2));
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
            return [parseInt(Math.round(x / weights_sum)),
                parseInt(Math.round(y / weights_sum))];
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
                    [parseInt(Math.round(i * step2)), height - 1],
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
                    [parseInt(Math.round(i * step2)), 0],
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
                    [width - 1, parseInt(Math.round(i * step2))],
                ]);
            }
            return cpMap;
        }

        function getHSVValue(imageData, pos, srcImageData, srcPos, test1, test2) {
            // see http://www.cs.rit.edu/~ncs/color/t_convert.html
            var v = Math.max(srcImageData[srcPos], srcImageData[srcPos + 1],
                srcImageData[srcPos + 2]);
            // 对亮图,重点展示阴影,而且原色彩越亮,阴影越明显, 对于暗图, 重点展示亮点,
            // 而且原色彩越暗, 亮点越明显. 但需要注意的是,这样会减少对比度. 所以不能
            // 做的太过
            return (v > 127) ? (imageData[pos] - test1) * (1 + v / 255) :
                (imageData[pos] - test2) * (2 - v / 255);
        }

        return JitPreview;
    });
