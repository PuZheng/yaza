define(['buckets', 'underscore', 'backbone', 'dispatcher', 'handlebars', 'text!templates/jit-preview.hbs', 'kineticjs', 'color-tools', 'underscore.string'],
    function (buckets, _, Backbone, dispatcher, Handlebars, jitPreviewTemplate, Kineticjs) {
        function getQueryVariable(variable) {
            var query = window.location.search.substring(1);
            var vars = query.split("&");
            for (var i=0;i<vars.length;i++) {
                var pair = vars[i].split("=");
                if(pair[0] == variable){return pair[1];}
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
                var jitPreview = this;

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
                            layer.destroy();
                            jitPreview._stage.draw();
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

                // 一定要创建一个新的layer，否则会连预览图像整个清除掉
                var layer = new Kinetic.Layer();
                layer.add(designRegionHex);
                jitPreview._stage.add(layer);
                

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
                    console.log('select ocspu ' + ocspu.id + ' ' + ocspu.color);
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
                    console.log('select aspect ' + aspect.id + ' ' + aspect.name);
                    // 必须使用one， 也就是说只能触发一次，否则加载新的图片，还要出发原有的handler
                    this.$('.hotspot img').attr('src', aspect.picUrl).one('load',
                        function (jitPreview, aspect) {
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
                                        console.log('calculate preview edges');
                                        designRegion.previewEdges = jitPreview._getPreviewEdges(
                                            designRegion.edges, 
                                            {
                                                x: jitPreview._stage.width() / aspect.size[0],
                                                y: jitPreview._stage.height() / aspect.size[1],
                                            });
                                    }
                                    if (!designRegion.bounds) {
                                        designRegion.bounds = jitPreview._getBounds(designRegion.previewEdges);
                                    }
                                });
                                jitPreview.$('select[name="current-design-region"]').change();
                            }
                        }(this, aspect));
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
                                        jitPreview._currentLayer = $(this).find("option:selected").data('layer');
                                        jitPreview._currentLayer.show();
                                        jitPreview._currentDesignRegion = designRegion;
                                        jitPreview._designRegionAnimate(designRegion.previewEdges);
                                        dispatcher.trigger('design-region-selected', designRegion);
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
                        this._currentDesignRegion.controlPointsMap = calcControlPoints(this._currentDesignRegion.previewEdges, playGroundLayer.size(), 
                            [4, 4]); 
                    }

                    console.log(playGroundLayer.size());
                    console.log(this._currentLayer.size());
                    console.log(this._currentDesignRegion.controlPointsMap);
                    var targetWidth = this._currentLayer.width();
                    var targetHeight = this._currentLayer.height();
                    var srcWidth = playGroundLayer.width();
                    var srcHeight = playGroundLayer.height();
                    for (var i = 0; i < targetWidth; ++i) {
                        for (var j = 0; j < targetHeight; ++j) {
                            if (this._within(i, j)) {
                                var origPoint = mvc([i, j], this._currentDesignRegion.controlPointsMap);
                                var pos = (i + j * targetWidth) * 4;
                                origPos = (origPoint[0] + (origPoint[1] * srcWidth))* 4;
                                hotspotImageData.data[pos] = srcImageData[origPos];
                                hotspotImageData.data[pos + 1] = srcImageData[origPos + 1];
                                hotspotImageData.data[pos + 2] = srcImageData[origPos + 2];
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
                }.bind(this));
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
            _within: function(x, y) {
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
                cp0 = cpPairs[(i-1 + cpPairsLen) % cpPairsLen][0];
                cp1 = cpPairs[i][0];
                cp2 = cpPairs[(i+1) % cpPairsLen][0];

                cos0 = getCos(point, cp0, cp1);
                cos1 = getCos(point, cp1, cp2);
                tan0 = Math.sqrt((1.0 - cos0) / (1.0 + cos0));
                tan1 = Math.sqrt((1.0 - cos1) / (1.0 + cos1));
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

        return JitPreview;
    });
