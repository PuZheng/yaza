define(['dispatcher', 'spu/context', 'backbone', 'handlebars', 'spu/models/aspect', 'text!templates/admin/spu/aspect.hbs', 
'bootstrap'], function (dispatcher, context, Backbone, handlebars, Aspect, aspectTemplate) {
    var AspectView = Backbone.View.extend({

        _template: handlebars.default.compile(aspectTemplate),
        
        events: {
            'click .panel-aspect .btn-cancel': function () {
                this.$el.fadeOut({
                    always: function () {
                        $(this).remove();
                    } 
                });
            },
            'click .panel-aspect .btn-ok': function () {
                var aspectName = this.$aspectNameInput.val();
                if (!aspectName) {
                    this.$aspectNameInput.data('error-label').show();
                    return false;
                }
                var files = this.$imageInput[0].files;
                var image = !!files.length && files[0];
                if (!image) {
                    this.$imageInput.data('error-label').show();
                    return false;
                }
                var data = this.$imageInput.data('data');
                data.aspect = {
                    name: aspectName,
                }
                $(event.target).addClass('disabled');
                data.submit();
            },

        },

        render: function () {
            this.$el.html(this._template());
            this.$aspectNameInput = this.$('.aspect-form .form-group:first-child input');
            this.$aspectNameInput.data('error-label', this.$('.aspect-form .form-group:first-child .text-danger'));
            this.$imageInput = this.$('.aspect-form .form-group:nth-child(2) :file');
            this.$imageInput.data('error-label', this.$('.aspect-form .form-group:nth-child(2) .text-danger'));
            this.$('.fancybox').fancybox();


            this.$aspectNameInput.keydown(function (event) {
                $(event.target).data('error-label').hide();
            }).keypress(function (aspectView) {
                return function (event) {
                    if (event.which != 13) {
                        return true;
                    } 
                    event.preventDefault();
                    if (!!aspectView._aspect) {
                        $(event.target).blur()
                        aspectView._aspect.set('name', $(this).val());
                        aspectView._aspect.save(['name'], {
                            success: function (model, response, options) {
                                dispatcher.trigger('flash', {
                                    type: 'success',
                                    msg: '成功修改Aspect名称 - ' + model.get('name') + '!', 
                                });             
                                aspectView.$('.panel-aspect > .panel-heading em').text(model.get('name'));
                            },
                            error: function () {
                                dispatcher.trigger('flash', {
                                    type: 'error',
                                    msg: '修改Aspect名称失败!', 
                                });             
                            },
                        });
                    }
                }
            }(this));

            this.$('.aspect-form').fileupload({
                url: 'http://up.qiniu.com',
                add: function (aspectView) {
                    return function (e, data) {
                        var $errorLabelEl = aspectView.$('.aspect-form .form-group:nth-child(2) .text-danger');
                        $errorLabelEl.hide();
                        var fileReader = new FileReader();
                        fileReader.onload = (function (a) {
                            return function (e) {
                                a.href = e.target.result;
                                $(a).find('img')[0].src = e.target.result;
                            };
                        })($(this).find('a.fancybox')[0]);
                        fileReader.readAsDataURL(data.files[0]);
                        aspectView.$imageInput.data('data', data);
                        if (!!aspectView._aspect) {
                            $(this).find('.uploading-progress').show();
                            data.aspect = {};
                            var jqXHR = data.submit();
                            aspectView.$('.aspect-form input').attr('disabled', '');
                            $(this).find('.uploading-progress .upload-cancel-btn').click(
                                function () {
                                    jqXHR.abort();
                                    $(this).find('.uploading-progress').fadeOut(1000);
                                });
                        }
                    }
                }(this),
                submit: function (aspectView) {
                    return function (e, data) {
                        $.getJSON('/admin/qiniu-upload-token', function (token) {
                            debugger;
                            var postfix = data.files[0].name.match(/png|jpeg|jpg/i);
                            postfix = (postfix && postfix[0]) || '';
                            data.formData = {
                                'key': 'aspect+' + new Date().getTime() + '.' + postfix,
                                'token': token.token,
                            };
                            data.aspect.picPath = 'http://yaza-spus.qiniu.com' + data.formData.key;
                            aspectView.$('.aspect-form .uploading-progress .progress-bar').text('0%').css('width', '0%').attr('aria-valuenow', 0);
                            aspectView.$('.aspect-form .uploading-progress').show();
                            aspectView.$('.aspect-form .uploading-progress .upload-cancel-btn').click(function () {
                                data.abort();
                                aspectView.$('.aspect-form .uploading-progress').fadeOut();
                            });
                            data.jqXHR = aspectView.$('.aspect-form').fileupload('send', data);
                            // 上传期间不能对input进行修改
                            aspectView.$('.aspect-form input').attr('disabled', '');
                        }).fail(function () {
                            dispatcher.trigger('flash', {
                                type: 'error',
                                msg: '不能获取七牛的上传token', 
                            });
                            data.abort();
                        });
                        // 之前已经send了， 就不要再submit
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
                done: (function (aspectView) { 
                    return function (e, data) {
                        // 若是之前没有创建过OCSPU, 就创建， 否则仅仅修改材质图
                        if (!aspectView._aspect) {
                            aspectView._aspect = new Aspect({
                                name: data.aspect.name,
                                'pic-path': data.aspect.picPath,
                                'ocspu-id': context.currentOCSPU.id,
                            });

                            aspectView._aspect.save(['name', 'pic-path', 'ocspu-id'], {
                                success: function (model, response, options) {
                                    aspectView.$('.aspect-form .uploading-progress').fadeOut(1000);
                                    dispatcher.trigger('flash', {
                                        type: 'success',
                                        msg: '成功创建Aspect - ' + data.aspect.name
                                    });
                                    aspectView.$('.panel-aspect > .panel-footer .btn-ok').hide();
                                    aspectView.$('.panel-aspect > .panel-footer .btn-cancel').hide();
                                    aspectView.$('.aspect-form input').removeAttr('disabled');
                                    aspectView.$('.panel-aspect > .panel-heading em').text(data.aspect.name);
                                    aspectView.$('.panel-aspect .btn-collapse').show();
                                    aspectView.$('.panel-aspect .btn-new-design-region').show();
                                    context.currentAspect = this._aspect;
                                },
                                error: function () {
                                    aspectView.$('.aspect-form .uploading-progress').fadeOut(1000);
                                    dispatcher.trigger('flash', {
                                        type: 'error',
                                        msg: '创建OCSPU失败!', 
                                    });             
                                    aspectView.$('.panel-aspect > .panel-footer .btn-ok').removeClass('disabled');
                                    aspectView.$('.aspect-form input').removeAttr('disabled');
                                    aspectView._aspect = null;
                                }
                            });
                        } else {  // 修改pic
                            aspectView._aspect.set('pic-path', data.aspect.picPath);
                            aspectView._aspect.save(['pic-path'], {
                                success: function (model, response, options) {
                                    aspectView.$('.aspect-form .uploading-progress').fadeOut(1000);
                                    dispatcher.trigger('flash', {
                                        type: 'success',
                                        msg: '成功修改Aspect图片为' + data.aspect.picPath,
                                    });
                                    aspectView.$('.aspect-form input').removeAttr('disabled');
                                },
                                error: function () {
                                    aspectView.$('.aspect-form .uploading-progress').fadeOut(1000);
                                    dispatcher.trigger('flash', {
                                        type: 'error',
                                        msg: '修改Aspect图片失败!', 
                                    });             
                                    aspectView.$('.aspect-form input').removeAttr('disabled');
                                }
                            });
                            
                        }

                    }
                })(this),
                fail: (function (aspectView) {
                    return function (e, data) {
                        $(this).find('.uploading-progress').fadeOut(1000);
                        dispatcher.trigger('flash', {
                            type: 'error',
                            msg: '创建Aspect失败',
                        });
                        aspectView.$('.panel-aspect .btn-ok').removeClass('disabled');
                        aspectView.$('.aspect-form input').removeAttr('disabled');
                    }
                })(this),

            });
            return this;
        },

        collapse: function () {
            
        },

        getAspect: function () {
            return this._aspect;
        }
    });

    return AspectView;
});
