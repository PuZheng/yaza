define(['dispatcher', 'spu/views/base-view',
        'spu/views/ocspu-view',
        'spu/models/ocspu'],
    function (dispatcher, BaseView, OCSPUView, OCSPU) {
        var SPUView = BaseView.extend({
            //注意 events不能写在BaseView, 否则每层都会触发
            events: {
                'click a.fancybox': function (event) {
                    event.preventDefault();
                    $(event.currentTarget).ekkoLightbox();
                }
            },
            label: 'SPU',
            fields: [
                {
                    name: 'name',
                    type: 'text',
                    label: '名称',
                    error: '名称不能为空',
                    placeholder: 'SPU名称',
                    class: 'col-md-4',
                }
            ],
            title: 'name',
            nextLevel: {
                objects: function (model) {
                    return model.get('ocspu-id-list').map(function (ocspuId) {
                        return new OCSPU({id: ocspuId});
                    });
                },
                view: OCSPUView,
                newObject: function () {
                    return new OCSPU();
                },
                parentRefBack: 'spu-id',
            },

            render: function (collapsed) {
                this.on('loaded', function () {
                    var s = '<button class="btn btn-primary btn-publish">' + '<i class="fa fa-eye"></i><span>发布</span>' + '</button>';
                    var $panelFooter = this.$('.panel-' + this.label + ' > .panel-footer');
                    this.$publishBtn = $(s).appendTo($panelFooter.find('.pull-right'));
                    this.on('object-created', function () {
                        this.$publishBtn.show();
                        // change the url without loading new page
                        history.pushState({}, 'page', '/admin/spu/' + this.model.id + '?__back_url__' + decodeURIComponent($.url('?__back_url__')));
                    });
                    if (this.model.id == undefined) {
                        this.$publishBtn.hide();
                    } else {
                        if (this.model.get('published')) {
                            this.$publishBtn.find('span').text('取消发布');
                            this.$publishBtn.find('i').removeClass('fa-eye').addClass('fa-eye-slash');
                            this.disable();
                        } else {
                            this.$publishBtn.find('span').text('发布');
                            this.$publishBtn.find('i').addClass('fa-eye').removeClass('fa-eye-slash');
                        }
                    }
                    this.$publishBtn.click(function (spuView) {
                        return function (e) {
                            if ($(e.currentTarget).find('span').text() == '发布') {
                                if (spuView.hasError()) {
                                    alert('请先修正错误再发布!');
                                    return;
                                }
                                try {
                                    spuView.checkDataIntegrity();
                                } catch (exception) {
                                    alert(exception.message);
                                    return;
                                }
                                dispatcher.trigger('mask', '正在发布, 可能要花几分钟的时间...');
                                spuView.model.set('published', true);
                                spuView.model.save(['published'], {
                                    success: function (model, response, options) {
                                        dispatcher.trigger('flash', {
                                            type: 'success',
                                            msg: '发布成功！',
                                        }); 
                                        dispatcher.trigger('unmask');
                                        spuView.$publishBtn.find('span').text('取消发布');
                                        spuView.$publishBtn.find('i').removeClass('fa-eye').addClass('fa-eye-slash');
                                        spuView.disable();
                                    }, 
                                    error: function (model, response, options) {
                                        dispatcher.trigger('flash', {
                                            type: 'error', 
                                            msg: '发布失败！<br>' + _(response.responseText).escapeHTML(),
                                        });
                                        dispatcher.trigger('unmask');
                                    }
                                });
                            } else {
                                dispatcher.trigger('mask', '正在取消发布...');
                                spuView.model.set('published', false);
                                spuView.model.save(['published'], {
                                    success: function (model, response, options) {
                                        dispatcher.trigger('flash', {
                                            type: 'success',
                                            msg: '取消发布成功！',
                                        }); 
                                        dispatcher.trigger('unmask');
                                        spuView.$publishBtn.find('span').text('发布');
                                        spuView.$publishBtn.find('i').addClass('fa-eye').removeClass('fa-eye-slash');
                                        spuView.enable();
                                    }, 
                                    error: function (model, response, options) {
                                        dispatcher.trigger('flash', {
                                            type: 'error', 
                                            msg: '取消发布失败！<br>' + _(response.responseText).escapeHTML(),
                                        });
                                        dispatcher.trigger('unmask');
                                    }
                                });
                            }
                        }
                    }(this));

                });
                return BaseView.prototype.render.call(this, collapsed);
            },

            checkDataIntegrity: function () {
                if (this.$listGroup.children().length == 0) {
                    throw {
                        message: '请先创建OCSPU',
                    };
                }
                this.$listGroup.children().each(function (idx, el) {
                    var ocspuView = $(el).data('view');
                    if (ocspuView.$listGroup.children().length == 0) {
                        throw {
                            message: '请为OCSPU(' + ocspuView.model.id + ')"' + ocspuView.model.get('color') + '"创建面!',
                        };
                    }
                    ocspuView.$listGroup.children().each(function (idx, el) {
                        var aspectView = $(el).data('view');
                        if (aspectView.$listGroup.children().length == 0) {
                            throw {
                                message: '请为面(' + aspectView.model.id + ')"' + aspectView.model.get('name') + '"创建设计区!',
                            };
                        }
                    })
                })
            }
        });
        return SPUView;
    });
