define(['spu/views/base-view', 'text!templates/admin/spu/design-region-vertex-selector.hbs', 'handlebars', 'kineticjs'], 
    function (BaseView, vertexSelectorTemplate, handlebars, Kinetic) {
        var DesignRegionView = BaseView.extend({
            

            label: '定制区',
            fields: [
                {
                    name: 'name',
                    type: 'text',
                    label: '名称',
                    error: '例如前胸...',
                    placeholder: '正面或者反面等...',
                }, 
                {
                    name: 'width',
                    type: 'number',
                    label: '宽度(英寸)',
                    error: '宽度不能为空',
                    attributes: [
                        {
                            name: 'step',
                            val: 0.01,
                        }
                    ]
                },
                {
                    name: 'height',
                    type: 'number',
                    label: '高度(英寸)',
                    error: '高度不能为空',
                    attributes: [
                        {
                            name: 'step',
                            val: 0.01,
                        }
                    ]
                },
                {
                    name: 'pic-path',
                    type: 'file',
                    label: '图片',
                    error: '图片不能为空',
                },
            ],
            title: 'name',
            render: function (collasped) {
                var ret = BaseView.prototype.render.call(this, collasped);
                if (true) {
                    // 一定不能写成this.$vertexSelector = $(vertexSelectorTemplate).appendTo(this.$el)， 因为$已经会将其初始化为modal， 而appendTo又将其container变化了，这样就会导致backdrop不能消失， 见http://stackoverflow.com/questions/11519660/twitter-bootstrap-modal-backdrop-doesnt-disappear
                    this.$el.append(vertexSelectorTemplate);
                    this.$vertexSelector = this.$('.desigin-region-vertex-selector');
                    this.$vertexSelector.on('shown.bs.modal', function (view) {
                        return function (e) {
                            var fr = new FileReader();
                            fr.onload = function (selector) {
                                return function (e) {
                                    var $img = $(selector).find('img.design-region-image');
                                    $img.attr('src', e.target.result).load(function (e) {
                                        var $zone = $(this).parent();
                                        if ($(this).height() / $(this).width() > $zone.height() / $zone.width()) {
                                            $(this).addClass('portrait').removeClass('landscape');
                                        } else {
                                            $(this).addClass('landscape').removeClass('portrait');
                                        }


                                        var $container = $(selector).find('.modal-body .canvas');
                                        
                                        view._stage = new Kinetic.Stage({
                                            container: $container.get(0),
                                            width: $container.width(),
                                            height: $container.height(),
                                        });

                                        view._layer = new Kinetic.Layer({
                                            width: $container.width(),
                                            height: $container.height(),
                                        });
                                        view._stage.add(view._layer);
                                        var offset = {
                                            x: $(this).parent().offset().left - $(this).offset().left,
                                            y: $(this).parent().offset().top - $(this).offset().top,
                                        };
                                        var rect = new Kinetic.Rect({
                                            stroke: '#999',
                                            strokeWidth: 1,
                                            width: $(this).width(),
                                            height: $(this).height(),
                                            offset: offset,
                                        });
                                        view._layer.add(rect);
                                        var hint = new Kinetic.Text({
                                            fontSize: 15,
                                            name: 'hint',
                                            fill: 'gray',
                                            x: 200,
                                            y: $(this).height() + 5,
                                            offset: offset,
                                        });    
                                        hint.hide();
                                        view._layer.add(hint);

                                        view._layer.add(view._makeTack('左上角', hint, offset, $(this)));
                                        view._layer.add(view._makeTack('右上角', hint, offset, $(this)).position({
                                            x: $(this).width(),
                                            y: 0,
                                        }));
                                        view._layer.add(view._makeTack('右下角', hint, offset, $(this)).position({
                                            x: $(this).width(),
                                            y: $(this).height(),
                                        }));
                                        view._layer.add(view._makeTack('左下角', hint, offset, $(this)).position({
                                            x: 0, 
                                            y: $(this).height(),
                                        }));
                                        view._stage.draw();
                                    });
                                }
                            }(this);
                            fr.readAsDataURL($(this).data('data').files[0]);
                            return false;
                        }
                    }(this));
                    var origAdd = this.$form.fileupload('option', 'add'); 
                    this.$vertexSelector.find('.btn').click(function (view) {
                        return function (e) {
                            origAdd.call(view.$form, e, view.$vertexSelector.data('data'));
                            var $img = view.$('img.design-region-image');
                            var proportion = {
                                x: $img[0].naturalWidth / $img.width(),
                                y: $img[0].naturalHeight / $img.height(),
                            };
                            var tack = view._layer.find('.左上角')[0];
                            view.$vertexSelector.data('left-top', [Math.round(tack.x() * proportion.x) || 0, Math.round(tack.y() * proportion.y) || 0]);
                            var tack = view._layer.find('.右上角')[0];
                            view.$vertexSelector.data('right-top', [Math.round(tack.x() * proportion.x) || 0, Math.round(tack.y() * proportion.y) || 0]);
                            var tack = view._layer.find('.右下角')[0];
                            view.$vertexSelector.data('right-bottom', [Math.round(tack.x() * proportion.x) || 0, Math.round(tack.y() * proportion.y) || 0]);
                            var tack = view._layer.find('.左下角')[0];
                            view.$vertexSelector.data('left-bottom', [Math.round(tack.x() * proportion.x) || 0, Math.round(tack.y() * proportion.y) || 0]);
                            view.$vertexSelector.modal('hide');
                        };
                    }(this));
                    this.$form.fileupload('option', 'add', function (view) {
                        return function (e, data) {
                            view.$vertexSelector.data('data', data).modal('show');
                        }
                    }(this));
                }
                return ret;
            },

            populateModel: function (data, fieldNames) {
                var ret = BaseView.prototype.populateModel.call(this, data, fieldNames);
                this.model.set('left-top', this.$vertexSelector.data('left-top'));
                this.model.set('right-top', this.$vertexSelector.data('right-top'));
                this.model.set('right-bottom', this.$vertexSelector.data('right-bottom'));
                this.model.set('left-bottom', this.$vertexSelector.data('left-bottom'));
                return ret;
            },

            _makeTack: function (name, hint, offset, $img) {
                view = this;
                var tack = new Kinetic.Text({
                    text: "\uF08D",
                    fontSize: 18,
                    fontFamily: 'FontAwesome',
                    fill: '#ff6e6e',
                    name: name,
                    draggable: true,
                });
                tack.offset({
                    x: offset.x + tack.width() / 2,
                    y: offset.y + tack.height(),
                }).on('mouseover', function (e) {
                    this.fill('red');
                    view._stage.draw();
                }).on('mouseout', function (e) {
                    this.fill('#ff6e6e');
                    hint.hide();
                    view._stage.draw();
                }).on('dragstart', function (e) {
                    hint.show();
                }).on('dragmove', function (e) {
                    var hint = view._layer.find('.hint')[0];
                    hint.text(name + ' - x: ' + Math.round(this.x() * $img[0].naturalWidth / $img.width()) + ', y: ' + Math.round(this.y() * $img[0].naturalHeight / $img.height()));
                    view._stage.draw();
                });
                return tack;
            },
        });
        return DesignRegionView;
    });
