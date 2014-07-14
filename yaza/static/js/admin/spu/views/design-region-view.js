define(['dispatcher', 'underscore', 'backbone', 'handlebars', 'text!templates/admin/spu/design-region.hbs', 'spu/models/design-region', 'jquery-file-upload', 'fancybox', 'underscore.string'], function (dispatcher, _, Backbone, handlebars, designRegionTemplate, DesignRegion) {

    _.mixin(_.str.exports());

    var DesignRegionView = Backbone.View.extend({

        _template: handlebars.default.compile(designRegionTemplate),

        events: {
            'click .panel-design-region > .panel-footer .btn-cancel': function () {
                this.$el.fadeOut({
                    always: function () {
                        $(this).remove();
                    }
                });
            },
            'click .panel-design-region > .panel-footer .btn-ok': function () {
                var name = this.$nameInput.val();
                var width = this.$widthInput.val();
                var height = this.$heightInput.val();
                var files = this.$imageInput[0].files;
                var image = !!files.length && files[0];
                
                if (!name) {
                    this.$nameInput.data('error-label').show();
                    return false;
                }
                if (!width) {
                    this.$widthInput.data('error-label').show();
                    return false;
                }
                if (!height) {
                    this.$heightInput.data('error-label').show();
                    return false;
                }
                if (!image) {
                    this.$imageInput.data('error-label').show();
                    return false;
                }
                var data = this.$imageInput.data('data');
                $(event.target).addClass('disabled');
                data.submit();
            },
        },

        initialize: function (option) {
            this._aspect = option.aspect;
        },
        
        render: function() {
            this.$el.html(this._template());
            this.$nameInput = this.$('.design-region-form .form-group:first-child input');
            this.$nameInput.data('error-label', this.$('.design-region-form .form-group:first-child .text-danger'));
            this.$widthInput = this.$('.design-region-form .form-group:nth-child(2) input.width');
            this.$heightInput = this.$('.design-region-form .form-group:nth-child(2) input.height');
            this.$widthInput.data('error-label', this.$('.design-region-form .form-group:nth-child(2) .text-danger'));
            this.$heightInput.data('error-label', this.$('.design-region-form .form-group:nth-child(2) .text-danger'));
            this.$imageInput = this.$('.design-region-form :file');
            this.$imageInput.data('error-label', this.$('.design-region-form .form-group:nth-child(3) .text-danger'));
            
            this.$('.fancybox').fancybox();
            this.$nameInput.keydown(function (e) {
                $(e.target).data('error-label').hide();
            }).keypress(function (designRegionView) {
                return function (event) {
                    if (event.which != 13) {
                        return true;
                    } 
                    event.preventDefault();
                    if (!!designRegionView._designRegion) {
                        $(event.target).blur()
                        designRegionView._designRegion.set('name', $(this).val());
                        designRegionView._designRegion.save(['name'], {
                            success: function (model, response, options) {
                                dispatcher.trigger('flash', {
                                    type: 'success',
                                    msg: '成功修改设计区名称 - ' + model.get('name') + '!', 
                                });             
                                designRegionView.$('.panel-design-region > .panel-heading em').text(model.get('name'));
                            },
                            error: function () {
                                dispatcher.trigger('flash', {
                                    type: 'error',
                                    msg: '修改设计区名称失败!', 
                                });             
                            },
                        });
                    }
                } 
            }(this));
            this.$widthInput.keydown(function (e) {
                $(e.target).data('error-label').hide();
            }).keypress(function (designRegionView) {
                return function (event) {
                    if (event.which != 13) {
                        return true;
                    } 
                    event.preventDefault();
                    if (!!designRegionView._designRegion) {
                        $(event.target).blur()
                        designRegionView._designRegion.set('width', $(this).val());
                        designRegionView._designRegion.save(['width'], {
                            success: function (model, response, options) {
                                dispatcher.trigger('flash', {
                                    type: 'success',
                                    msg: '成功修改设计区宽度 - ' + model.get('width') + '!', 
                                });             
                                designRegionView.$('.panel-design-region > .panel-heading em').text(model.get('name'));
                            },
                            error: function () {
                                dispatcher.trigger('flash', {
                                    type: 'error',
                                    msg: '修改设计区宽度失败!', 
                                });             
                            },
                        });
                    }
                }
            }(this));
            this.$heightInput.keydown(function (e) {
                $(e.target).data('error-label').hide();
            }).keypress(function (designRegionView) {
                return function (event) {
                    if (event.which != 13) {
                        return true;
                    } 
                    event.preventDefault();
                    if (!!designRegionView._designRegion) {
                        $(event.target).blur()
                        designRegionView._designRegion.set('height', $(this).val());
                        designRegionView._designRegion.save(['height'], {
                            success: function (model, response, options) {
                                dispatcher.trigger('flash', {
                                    type: 'success',
                                    msg: '成功修改设计区高度 - ' + model.get('height') + '!', 
                                });             
                                designRegionView.$('.panel-design-region > .panel-heading em').text(model.get('name'));
                            },
                            error: function () {
                                dispatcher.trigger('flash', {
                                    type: 'error',
                                    msg: '修改设计区高度失败!', 
                                });             
                            },
                        });
                    }
                }
            }(this));

            this.$('.design-region-form').fileupload({
                url: 'http://up.qiniu.com',
                add: function (designRegionView) {
                    return function (e, data) {
                        var $errorLabelEl = designRegionView.$('.design-region-form .form-group:nth-child(3) .text-danger');
                        $errorLabelEl.hide();
                        var fr = new FileReader();
                        fr.onload = (function (a) {
                            return function (e) {
                                a.href = e.target.result;
                                $(a).find('img')[0].src = e.target.result;
                            };
                        })($(this).find('a.fancybox')[0]);
                        fr.readAsDataURL(data.files[0]); 
                        designRegionView.$imageInput.data('data', data);
                        if (!!designRegionView._designRegion) {
                            $(this).find('.uploading-progress').show();
                            var jqXHR = data.submit();
                            designRegionView.$('.desigin-region-form input').attr('disabled', '');
                            $(this).find('.uploading-progress .upload-cancel-btn').click(
                                function () {
                                    jqXHR.abort();
                                    $(this).find('.uploading-progress').fadeOut(1000);
                                });
                        }
                    } 
                }(this), 
                submit: function (designRegionView) {
                    return function (e, data) {
                        
                        $.getJSON('/admin/qiniu-upload-token', function (token) {
                            var postfix = data.files[0].name.match(/png|jpeg|jpg/i);
                            postfix = (postfix && postfix[0]) || '';
                            data.formData = {
                                'key': 'design-region+' + new Date().getTime() + '.' + postfix,
                                'token': token.token,
                            };
                            designRegionView.$('.design-region-form .uploading-progress .progress-bar').text('0%').css('width', '0%').attr('aria-valuenow', 0);
                            designRegionView.$('.design-region-form .uploading-progress').show();
                            designRegionView.$('.design-region-form .uploading-progress .upload-cancel-btn').click(function () {
                                data.abort();
                                designRegionView.$('.design-region-form .uploading-progress').fadeOut();
                            });
                            data.jqXHR = designRegionView.$('.design-region-form').fileupload('send', data);
                            designRegionView.$('.design-region-form input').attr('disabled', '');
                        }).fail(function () {
                            dispatcher.trigger('flash', {
                                type: 'error',
                                msg: '不能获取七牛的上传token', 
                            });
                            data.abort();
                        });
                        return false;
                    }
                }(this),
                progress: function (e, data) {
                    // Calculate the completion percentage of the upload
                    var progress = parseInt(data.loaded / data.total * 100, 10);
                    // Update the hidden input field and trigger a change
                    // so that the jQuery knob plugin knows to update the dial
                    $(this).find('.uploading-progress .progress-bar').text(progress + '%').css('width', progress + '%').attr('aria-valuenow', progress);
                },
                done: function (designRegionView) {
                    return function (e, data) {
                        if (!designRegionView._designRegion) {
                            designRegionView._designRegion = new DesignRegion({
                                name: designRegionView.$nameInput.val(),
                                width: designRegionView.$widthInput.val(),
                                height: designRegionView.$heightInput.val(),
                                'aspect-id': designRegionView._aspect.id,
                                'pic-path': 'http://yaza-spus.qiniu.com' + data.formData.key,
                            });
                            designRegionView._designRegion.save(['name', 'width', 'height', 'aspect-id', 'pic-path'], {
                                success: function (model, response, options) {
                                    designRegionView.$('.design-region-form .uploading-progress').fadeOut(1000);
                                    dispatcher.trigger('flash', {
                                        type: 'success',
                                        msg: '成功创建设计区 - ' + designRegionView.$nameInput.val(),
                                    });
                                    designRegionView.$('.panel-design-region > .panel-footer .btn-ok').hide();
                                    designRegionView.$('.panel-design-region > .panel-footer .btn-cancel').hide();
                                    designRegionView.$('.design-region-form input').removeAttr('disabled');
                                    designRegionView.$('.panel-design-region > .panel-heading em').text(designRegionView._designRegion.get('name'));
                                    designRegionView.$('.panel-design-region .btn-collapse').show();
                                },
                                error: function () {
                                    designRegionView.$('.design-region-form .uploading-progress').fadeOut(1000);
                                    dispatcher.trigger('flash', {
                                        type: 'error',
                                        msg: '创建定制区失败!', 
                                    });             
                                    designRegionView.$('.panel-design-region > .panel-footer .btn-ok').removeClass('disabled');
                                    designRegionView.$('.design-region-form input').removeAttr('disabled');
                                    designRegionView._designRegion = null;
                                },
                            });
                        } else {  // 修改图片
                            designRegionView._aspect.set('pic-path', 'http://yaza-spus.qiniu.com' + data.formData.key);
                            designRegionView._aspect.save(['pic-path'], {
                                success: function (model, response, options) {
                                    designRegionView.$('.design-region-form .uploading-progress').fadeOut(1000);
                                    dispatcher.trigger('flash', {
                                        type: 'success',
                                        msg: '成功修改设计区图片为' + model.get('pic-path'),
                                    });
                                    designRegionView.$('.design-region-form input').removeAttr('disabled');
                                },
                                error: function () {
                                    designRegionView.$('.design-region-form .uploading-progress').fadeOut(1000);
                                    dispatcher.trigger('flash', {
                                        type: 'error',
                                        msg: '修改设计区图片失败!', 
                                    });             
                                    designRegionView.$('.design-region-form input').removeAttr('disabled');
                                }
                            });
                        }
                    }
                }(this),
                fail: (function (designRegionView) {
                    return function (e, data) {
                        $(this).find('.uploading-progress').fadeOut(1000);
                        dispatcher.trigger('flash', {
                            type: 'error',
                            msg: '创建Aspect失败',
                        });
                        designRegionView.$('.panel-design-region .btn-ok').removeClass('disabled');
                        designRegionView.$('.design-region-form input').removeAttr('disabled');
                    }
                })(this),
            });
            return this;
        },

        collapse: function () {
        },

        getDesignRegion: function () {
            return this._designRegion;        
        }
    });

    return DesignRegionView;
})
