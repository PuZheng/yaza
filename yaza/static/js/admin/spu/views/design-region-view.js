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
                },
                {
                    name: 'height',
                    type: 'number',
                    label: '高度(英寸)',
                    error: '高度不能为空',
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
                if (!collasped) {
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
                                            $(this).addClass('portrait');
                                        } else {
                                            $(this).addClass('landscape');
                                        }


                                        var $container = $(selector).find('.modal-body .canvas');
                                        
                                        view._stage = new Kinetic.Stage({
                                            container: $container.get(0),
                                            width: $container.width(),
                                            height: $container.height(),
                                        });

                                        view._layer = new Kinetic.Layer({
                                            width: $(this).width(),
                                            height: $(this).height(),
                                            x: $(this).offset().left - $(this).parent().offset().left,
                                            y: $(this).offset().top - $(this).parent().offset().top,
                                        });
                                        view._stage.add(view._layer);
                                        var rect = new Kinetic.Rect({
                                            stroke: '#999',
                                            strokeWidth: 1,
                                            width: $(this).width(),
                                            height: $(this).height(),
                                        });
                                        view._layer.add(rect);
                                        var tack = new Kinetic.Text({
                                            x: 50, 
                                            y: 50,
                                            //text: String.fromCharCode("\f08d"),
                                            text: "\uF08D",
                                            fontSize: 15,
                                            fontFamily: 'FontAwesome',
                                            fill: 'red',
                                        });
                                        view._layer.add(tack);
                                        view._stage.draw();
                                    });
                                }
                            }(this);
                            fr.readAsDataURL($(this).data('data').files[0]);
                            return false;
                        }
                    }(this));
                    var origAdd = this.$form.fileupload('option', 'add'); 
                    this.$vertexSelector.find('.btn').click(function ($selector) {
                        return function (e) {
                            origAdd.call(this, e, $selector.data('data'));
                        };
                    }(this.$vertexSelector));
                    this.$form.fileupload('option', 'add', function (view) {
                        return function (e, data) {
                            view.$vertexSelector.data('data', data).modal('show');
                        }
                    }(this));
                }
                return ret;
            },
            populateModel: function () {
                return BaseView.prototype.populateModel.call(this);
            } 
        });
        return DesignRegionView;
    });
