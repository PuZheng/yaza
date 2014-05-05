define(['underscore', 'backbone', 'dispatcher', 'handlebars', 'text!templates/jit-preview.hbs', 'kineticjs', 'color-tools', 'underscore.string'],
    function (_, Backbone, dispatcher, Handlebars, jitPreviewTemplate, Kineticjs) {

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

                var jitPreview = this;
                dispatcher.on('design-region-selected', function (designRegion, aspectSize) {
                    var data = jitPreview._calcCurrentPoints(designRegion, aspectSize);
                    jitPreview._designRegionAnimate(data);
                });
            },

            _calcCurrentPoints: function (designRegion, originalSize) {
                var positions = ['top', 'left', 'bottom', 'right'];
                var X = 0;
                var Y = 1;
                var currentSize = [this.$('.hotspot img').width(), this.$('.hotspot img').height()];
                var result = [];
                for (idx in positions) {
                    var val = designRegion.edges[positions[idx]];
                    _.each(val, function (v) {
                        result.push(v[X] * currentSize[X] / originalSize[X]);
                        result.push(v[Y] * currentSize[Y] / originalSize[Y]);
                    });
                }
                return result;
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

            _designRegionAnimate: function (data) {
                var jitPreview = this;
                jitPreview._currentLayer.removeChildren();
                var designRegionHex = new Kinetic.Line({
                    points: data,
                    stroke: 'red',
                    strokeWidth: 3,
                });

                jitPreview._currentLayer.add(designRegionHex);

                var period = 2000;

                jitPreview._colorTrans(designRegionHex, period / 100);

                var sizeAnim = new Kinetic.Animation(function (frame) {
                    var scale = Math.sin(frame.time * 2 * Math.PI / period) + 0.01;
                    if (!!sizeAnim && scale > 1) {
                        designRegionHex.scale({x: 1, y: 1});
                        sizeAnim.stop();
                        designRegionHex.transIn();
                    } else {
                        designRegionHex.scale({x: scale, y: scale});
                    }
                }, jitPreview._currentLayer);

                sizeAnim.start();
//                jitPreview._curentLayer.draw();
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
                        function (playGround) {
                            return function () {
                                playGround.$('.design-regions').css({
                                    width: $(this).width(),
                                    height: $(this).height(),
                                }).offset($(this).offset());
                                playGround._stage.width($(this).width());
                                playGround._stage.height($(this).height());
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
                        //var hotspotContext = layer.getContext();
                        //var hotspotImageData = hotspotContext.createImageData(400, 300);
                        $(_.sprintf('<option value="%d">%s</option>', designRegion.id,
                            designRegion.name)).data('design-region', designRegion).
                            data('layer', layer).appendTo(select);

                    }.bind(this));
                    $('select[name="current-design-region"]').change(
                        function (designRegionList, jitPreview) {
                            return function (evt) {
                                for (var i = 0; i < designRegionList.length; ++i) {
                                    var designRegion = designRegionList[i];
                                    if (designRegion.id == $(this).val()) {
                                        $("option:not(:selected)").each(function () {
                                            $(this).data("layer").hide();
                                        });

                                        jitPreview._currentLayer = $(this).find("option:selected").data('layer');
                                        jitPreview._currentLayer.show();
                                        dispatcher.trigger('design-region-selected', designRegion, aspect.size);
                                        break;
                                    }
                                }
                            }
                        }(aspect.designRegionList, this)).change();
                },
            },

            render: function () {
                this.$el.append(this._template({spu: this._spu}));
                this._stage = new Kinetic.Stage({
                    container: this.$('.design-regions')[0],
                });
                this.$('.ocspu-selector .thumbnail').each(function (idx, e) {
                    $(e).data('ocspu', this._spu.ocspuList[idx]);
                }.bind(this));
                this.$('.ocspu-selector .thumbnail:first-child').click();
                dispatcher.on('update-hotspot', function (layer) {
                    // TODO 当design region没有发生变化，不应该生成预览
                    console.log('hotspot updated');
                }.bind(this));

            },
        });
        return JitPreview;
    });
