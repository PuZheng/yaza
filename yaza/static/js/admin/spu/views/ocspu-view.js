define(['jquery', 'dispatcher', 'spu/views/base-view', 
    'spu/views/ocspu-view',
    'spu/views/aspect-view',
    'spu/models/aspect', 
    'spu/models/ocspu'], 
    function ($, dispatcher, BaseView, OCSPUView, AspectView, Aspect, OCSPU) {
        var OCSPUView = BaseView.extend({
            label: 'OCSPU',
            fields: [
                {
                    name: 'color',
                    type: 'text',
                    label: '底色名称',
                    error: '底色名称不能为空',
                    placeholder: '例如棕红色, 银灰色...',
                },
                {
                    name: 'rgb',
                    type: 'color',
                    label: '底色RGB',
                    error: '底色不能为空',
                },
                {
                    name: 'cover-path',
                    type: 'file',
                    label: '材质图',
                    error: '材质图不能为空',
                }
            ],
            title: 'color',
            nextLevel: {
                objects: function (model) {
                    return model.get('aspect-id-list').map(function (aspectId) {
                        return new Aspect({
                            id: aspectId,
                        });
                    });
                },
                view: AspectView,
                newObject: function () {
                    return new Aspect();
                },
                parentRefBack: 'ocspu-id',
            },
            render: function (collapsed) {
                var ret = BaseView.prototype.render.call(this, collapsed);
                var s = '<button class="btn btn-xs btn-primary btn-clone" title="克隆OCSPU">' + 
                    '<i class="fa fa-copy"></i>' + '</button>';
                this.$cloneBtn = $(s).appendTo(this.$entry.find('.pull-right')).click(function (view) {
                    return function (e) {
                        dispatcher.trigger('mask', '正在克隆...');
                        $.post('/spu-ws/ocspu.json?clone-to=' + view.model.id).done(function (data) {
                            var ocspu = new OCSPU({id: data.id}); 
                            ocspu.fetch({
                                success: function () {
                                    view._parentView.$listGroup.children().each(function (i, el) {
                                        $(el).data('view').collapse();
                                    }); 
                                    var $el = $('<div class="' + view.label + '"></div>').appendTo(view._parentView.$listGroup);
                                    var newOCSPUView = new OCSPUView({
                                        el: $el, 
                                        model: ocspu, 
                                        parentView: view._parentView,
                                    });
                                    newOCSPUView.on('loaded', function () {
                                        $el.data('view', newOCSPUView);
                                        dispatcher.trigger('flash', {
                                            type: 'success',
                                            msg: '成功克隆OCSPU!',
                                        });
                                        dispatcher.trigger('unmask');
                                        dispatcher.trigger('validate');
                                    });
                                    newOCSPUView.render();
                                },
                                error: function () {
                                    dispatcher.trigger('flash', {
                                        type: 'error',
                                        msg: '获取OCSPU失败!',
                                    });
                                    dispatcher.trigger('unmask');
                                },
                            });
                        }).fail(function () {
                            dispatcher.trigger('flash', {
                                type: 'error',
                                msg: '克隆OCSPU失败!',
                            });
                            dispatcher.trigger('unmask');
                        });
                    }
                }(this));
                return ret;
            },

            enable: function () {
                BaseView.prototype.enable.call(this);
                this.$cloneBtn.removeClass('disabled');
            },

            disable: function () {
                BaseView.prototype.disable.call(this);
                this.$cloneBtn.addClass('disabled');
            }
        });
        return OCSPUView;
    });
