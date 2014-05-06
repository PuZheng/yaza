define(['buckets', 'underscore', 'backbone', 'dispatcher', 'handlebars', 'text!templates/jit-preview.hbs', 'kineticjs', 'color-tools', 'underscore.string'],
    function (buckets, _, Backbone, dispatcher, Handlebars, jitPreviewTemplate, Kineticjs) {

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
                jitPreview._currentLayer.getChildren(function (node) {
                    return node.name == 'highlight-frame';
                }).forEach(function (node) {
                    node.remove();
                });
                var data = [];
                ['top', 'left', 'bottom', 'right'].forEach(function (position) {
                    data.push.apply(data, edges[position]);
                });
                var designRegionHex = new Kinetic.Line({
                    points: data,
                    stroke: 'red',
                    strokeWidth: 1,
                    name: 'highlight-frame',
                });

                jitPreview._currentLayer.add(designRegionHex);
                jitPreview._stage.draw();
                

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
                    ocspu.aspectList.forEach(function (aspect) {
                        $(_.sprintf('<div class="thumbnail"><img src="%s" alt="%s" title="%s"/></div>', aspect.picUrl, aspect.name, aspect.name)).appendTo(this.$('.aspect-selector')).data('aspect', aspect);
                    }.bind(this));
                    if (!this._currentAspectName) {
                        this.$('.aspect-selector .thumbnail:first-child').click();
                    } else {
                        // 切换ocspu的时候，不切换面
                        this.$(_.sprintf('.aspect-selector .thumbnail img[title="%s"]', this._currentAspectName)).parent().click();
                    }
                },
                'click .aspect-selector .thumbnail': function (evt) {
                    this.$(".aspect-selector .thumbnail").removeClass("selected");
                    $(evt.currentTarget).addClass("selected");
                    // show hotspot
                    var aspect = $(evt.currentTarget).data('aspect');
                    this.$('.hotspot img').attr('src', aspect.picUrl).load(
                        function (jitPreview) {
                            return function () {
                                jitPreview.$('.design-regions').css({
                                    width: $(this).width(),
                                    height: $(this).height()
                                }).offset($(this).offset());
                                jitPreview._stage.width($(this).width());
                                jitPreview._stage.height($(this).height());
                                jitPreview._stage.children.forEach(function (node) {
                                    // 只改变当前面的所有layer的大小
                                    if (node.nodeType === 'Layer' && node.visible) {
                                        node.size(jitPreview._stage.size());
                                    }
                                });
                                aspect.designRegionList.forEach(function (designRegion) {
                                    if (!designRegion.previewEdges) {
                                        designRegion.previewEdges = jitPreview._getPreviewEdges(
                                            designRegion.edges, 
                                            {
                                                x: jitPreview._stage.width() / aspect.size[0],
                                                y: jitPreview._stage.height() / aspect.size[1],
                                            });
                                    }
                                    if (!designRegion.edgeSet) {
                                        designRegion.edgeSet = jitPreview._getEdgeSet(designRegion.previewEdges);
                                    }
                                });
                                jitPreview.$('select[name="current-design-region"]').change();
                            }
                        }(this));
                    this._currentAspectName = aspect.name;

                    var select = this.$('select[name="current-design-region"]');
                    // 清除当前每个定制区的layer
                    select.find('option').each(function () {
                        var layer = $(this).data('layer');
                        layer.remove();
                    });
                    select.empty();
                    aspect.designRegionList.forEach(function (designRegion) {
                        var layer = this._layerCache[designRegion.id];
                        if (!layer) {
                            var layer = new Kinetic.Layer();
                            this._layerCache[designRegion.id] = layer;
                            this._stage.add(layer);
                            // 没有缓存， 产生预览
                        } else {
                            this._stage.add(layer);
                            this._stage.draw();
                        }
                        $(_.sprintf('<option value="%d">%s</option>', designRegion.id,
                            designRegion.name)).data('design-region', designRegion).
                            data('layer', layer).appendTo(select);

                    }.bind(this));
                    this.$('select[name="current-design-region"]').change(
                        function (designRegionList, jitPreview) {
                            return function (evt) {
                                for (var i = 0; i < designRegionList.length; ++i) {
                                    var designRegion = designRegionList[i];
                                    if (designRegion.id == $(this).val()) {
                                        //$("option:not(:selected)").each(function () {
                                            //$(this).data("layer").hide();
                                        //});

                                        jitPreview._currentLayer = $(this).find("option:selected").data('layer');
                                        jitPreview._currentLayer.show();

                                        jitPreview._currentDesignRegion = designRegion;
                                        dispatcher.trigger('design-region-selected', designRegion);

                                        jitPreview._designRegionAnimate(designRegion.previewEdges);
                                        break;
                                    }
                                }
                            }
                        }(aspect.designRegionList, this));
                }
            },

            render: function () {
                this.$el.append(this._template({spu: this._spu}));
                this._stage = new Kinetic.Stage({
                    container: this.$('.design-regions')[0]
                });
                this.$('.ocspu-selector .thumbnail').each(function (idx, e) {
                    $(e).data('ocspu', this._spu.ocspuList[idx]);
                }.bind(this));
                this.$('.ocspu-selector .thumbnail:first-child').click();

                dispatcher.on('update-hotspot', function (playGroundLayer) {
                    console.log('hotspot updated');
                    if (playGroundLayer.children.length == 0) {
                        return;
                    }
                    var hotspotContext = this._currentLayer.getContext();
                    var hotspotImageData = hotspotContext.createImageData(this._currentLayer.width(), this._currentLayer.height());
                    var srcImageData = playGroundLayer.getContext().getImageData(0, 0, 
                        playGroundLayer.width(), playGroundLayer.height()).data;

                    if (!this._currentDesignRegion.controlPointsMap) {
                        this._currentDesignRegion.controlPointsMap = calcControlPoints(this._currentDesignRegion.edges, playGroundLayer.size(), [4, 4]); 
                    }

                    for (var i = 0; i < this._currentLayer.width(); ++i) {
                        var met_edge = 0;
                        for (var j = 0; j < this._currentLayer.height(); ++j) {
                            if (this._currentDesignRegion.edgeSet.contains([i, j])) {
                                met_edge += 1;
                                var pos = (i + j * width) * 4;
                                hotspotImageData.data[pos] = 255;
                                hotspotImageData.data[pos + 1] = 0;
                                hotspotImageData.data[pos + 2] = 0;
                                hotspotImageData.data[pos + 3] = 255;
                            } else {
                                if (met_edge == 1) {
                                    origPoint = mvc([i, j], this._currentDesignRegion.controlPointsMap);
                                    var pos = (i + j * width) * 4;
                                    var origPos = (origPoint[0] + (origPoint[1] * width))* 4;
                                    hotspotImageData.data[pos] = srcImageData[origPos];
                                    hotspotImageData.data[pos + 1] = srcImageData[origPos + 1];
                                    hotspotImageData.data[pos + 2] = srcImageData[origPos + 2];
                                    hotspotImageData.data[pos + 3] = srcImageData[origPos + 3];
                                } else if (met_edge == 2) {
                                    break; 
                                }
                            }
                        }
                    }
                    hotspotContext.putImageData(hotspotImageData, 0, 0);
                    var rect = new Kinetic.Rect({
                        x: 0,
                        y: 0,
                        stroke: 'red',
                        strokeWidth: 1,
                        width: 800,
                        height: 90,
                        dash: [5, 5],
                        name: 'rect',
                    });
                    this._currentLayer.add(rect);
                    this._stage.draw();
                }.bind(this));
            },

            _getPreviewEdges: function (edges, ratio) {
                var ret = {};
                ['top', 'left', 'bottom', 'right'].forEach(function (position) {
                    ret[position] = edges[position].map(function (point) {
                        return [Math.round(point[0] * ratio.x), Math.round(point[1] * ratio.y)];
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
                cp0 = cpPairs[(i-1 + cpPairsLen) % cpPairsLen][0];
                cp1 = cpPairs[i][0];
                cp2 = cpPairs[(i+1) % cpPairsLen][0];

                cos0 = getCos(point, cp0, cp1);
                cos1 = getCos(point, cp1, cp2);
                if (cos1 <= -1 || cos0 <= -1) {
                    weights.push(0);
                    continue;
                }
                tan0 = Math.sqrt(Math.max(0, 1.0 - cos0) / (1 + cos0));
                tan1 = Math.sqrt(Math.max(0, 1.0 - cos1) / (1 + cos1));
                w = (tan0 + tan1) / Math.sqrt(Math.pow(cp1[0] - point[0], 2) + Math.pow(cp1[1] - point[1], 2));
                weights.push(w);
            }

            var x = 0.0;
            var y = 0.0;
            var weights_sum = weights.reduce(function (a, b) { return a + b;}, 0);
            for (var i = 0; i < cpPairsLen; ++i) {
                x += weights[i] * cpPairs[i][1][0];
                y += weights[i] * cpPairs[i][1][1];
            }
            return [Math.round(x / weights_sum), Math.round(y / weights_sum)];
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
            cpMap.push([top[top.length -1], [width - 1, height - 1]]);
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
            var steps = height / (cpNum[1] - 1);
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

        return JitPreview;
    });
