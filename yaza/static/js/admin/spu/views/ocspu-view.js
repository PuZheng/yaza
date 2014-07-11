define(['dispatcher', 'spu/context', 'backbone', 'spu/views/aspect-view', 'spu/models/ocspu', 'handlebars', 'text!templates/admin/spu/ocspu.hbs', 'spectrum', 'fancybox', 'jquery-file-upload'], function (dispatcher, context, Backbone, AspectView, OCSPU, handlebars, ocspuTemplate) {
    var OcspuView = Backbone.View.extend({
        el: 'div',

        _template: handlebars.default.compile(ocspuTemplate),

        events: {
            'click .panel-new-ocspu .btn-cancel': function() {

                this.$el.fadeOut({
                    always: function () {
                        $(this).remove();
                    }
                });
            }, 

            'click .panel-new-ocspu > .panel-footer .btn-ok': function () {
                var colorName = this.$colorNameInput.val();
                var files = this.$materialImageInput[0].files;
                var materialImage = !!files.length && files[0];
                var rgb = this.$rgbInput.val();
                if (!colorName) {
                    this.$colorNameInput.focus().data('error-label').show();
                    return false;
                }
                if (!rgb) {
                    this.$rgbInput.focus().data('error-label').show();
                    return false;
                }
                if (!materialImage) {
                    this.$materialImageInput.focus().data('error-label').show();
                    return false;
                }
                var data = this.$materialImageInput.data('data');
                data.ocspu = {
                    color: colorName,
                    rgb: rgb,
                };
                $(event.target).addClass('disabled');
                var jqXHR = data.submit();
            },

            'click .btn-new-aspect': function () {
                if (this._aspectView == undefined) {
                    var $aspectEl = $('<div class="aspect"></div>').insertAfter(this.$('.ocspu-form'));
                    this._aspectView = new AspectView({el: $aspectEl}).render();
                } else if (!!this._aspectView.getAspect()) { 
                    this._aspectView.collapse();
                    var $aspectEl = $('<div class="aspect"></div>').insertAfter(this.$('.ocspu-form'));
                    this._aspectView = new AspectView({el: $aspectEl}).render();
                
                }
            },
        },

        render: function () {
            this.$el.html(this._template());
            this.$colorNameInput = this.$('.ocspu-form .form-group:first-child input');
            this.$colorNameInput.data('error-label', this.$('.ocspu-form .form-group:first-child .text-danger'));
            this.$rgbInput = this.$('.ocspu-form .form-group:nth-child(2) input');
            this.$rgbInput.data('error-label', this.$('.ocspu-form .form-group:nth-child(2) .text-danger'));
            this.$materialImageInput = this.$('.ocspu-form :file'); 
            this.$materialImageInput.data('error-label', this.$('.ocspu-form .form-group:nth-child(3) .text-danger'));

            this.$colorNameInput.keydown(function (event) {
                $(this).data('error-label').hide();
            }).keypress(function (ocspuView) {
                return function (event) {
                    if (event.which != 13) {
                        return true;
                    } 
                    event.preventDefault();
                    if (!!ocspuView._ocspu) {
                        $(event.target).blur()
                        ocspuView._ocspu.set('color', $(this).val());
                        ocspuView._ocspu.save(['color'], {
                            success: function (model, response, options) {
                                dispatcher.trigger('flash', {
                                    type: 'success',
                                    msg: '成功修改OCSPU颜色名称 - ' + model.get('color') + '!', 
                                });             
                                ocspuView.$('.panel-new-ocspu > .panel-heading em').text(model.get('color'));
                            },
                            error: function () {
                                dispatcher.trigger('flash', {
                                    type: 'error',
                                    msg: '修改OCSPU颜色名称失败!', 
                                });             
                            },
                        });
                    }
                }
            }(this));
            this.$rgbInput.spectrum({
                preferredFormat: "hex",
                chooseText: "确定",
                cancelText: "取消",
                showInput: true,
                allowEmpty: true,
                change: function (ocspuView) {
                    return function (event) {
                        $(this).data('error-label').hide();
                        if (!!ocspuView._ocspu) {
                            ocspuView._ocspu.set('rgb', $(this).val());
                            ocspuView._ocspu.save(['rgb'], {
                                success: function (model, response, options) {
                                    dispatcher.trigger('flash', {
                                        type: 'success',
                                        msg: '成功修改OCSPU色彩 - ' + model.get('rgb') + '!', 
                                    });             
                                },
                                error: function () {
                                    dispatcher.trigger('flash', {
                                        type: 'error',
                                        msg: '修改OCSPU色彩失败!', 
                                    });             
                                },
                            });
                        }
                    }
                }(this),
            });
            this.$('.aspect').hide();
            this.$('.fancybox').fancybox();
            // 因为上传文件的原因， 只能手动写ajax
            this.$('.ocspu-form').fileupload({
                dataType: 'json',
                url: 'http://up.qiniu.com',
                add: (function (ocspuView) {
                    return function (e, data) {

                        // 这里不用$materialImageInput.data('error-label')是由于fileupload这个插件会替换掉ocspuView.$materialImageInput
                        var $errorLabelEl = ocspuView.$('.ocspu-form .form-group:nth-child(3) .text-danger');
                        $errorLabelEl.hide();
                        var fileReader = new FileReader();
                        fileReader.onload = (function (a) {
                            return function (e) {
                                a.href = e.target.result;
                                $(a).find('img')[0].src = e.target.result;
                            };
                        })($(this).find('a.fancybox')[0]);
                        fileReader.readAsDataURL(data.files[0]);
                        ocspuView.$materialImageInput.data('data', data);
                        // 只有修改ocspu的材质图的时候， 才直接提交数据
                        if (!!ocspuView._ocspu) {
                            $(this).find('.uploading-progress').show();
                            data.ocspu = {};
                            var jqXHR = data.submit();
                            ocspuView.$('.ocspu-form input').attr('disabled', '');
                            $(this).find('.uploading-progress .upload-cancel-btn').click(
                                function () {
                                    jqXHR.abort();
                                    $(this).find('.uploading-progress').fadeOut(1000);
                                });
                        }
                    }
                })(this),
                submit: (function (ocspuView) {
                    return function (e, data) {
                        // get qiniu upload token
                        var that = this;
                        $.getJSON('/admin/qiniu-upload-token', function (token) {
                            // 先上传到qiniu
                            var postfix = data.files[0].name.match(/png|jpeg|jpg/i);
                            postfix = (postfix && postfix[0]) || '';
                            data.formData = {
                                'key': 'material+' + new Date().getTime() + '.' + postfix,
                                'token': token.token,
                            };
                            data.ocspu['cover-path'] = 'http://yaza-spus.qiniu.com/' + data.formData.key;
                            console.log('upload image to qiniu');
                            $(that).find('.uploading-progress .progress-bar').text('0%').css('width', '0%').attr('aria-valuenow', 0);
                            ocspuView.$('.ocspu-form .uploading-progress').show();
                            $(that).find('.uploading-progress .upload-cancel-btn').click(
                                function () {
                                    data.abort();
                                    ocspuView.$('.ocspu-form .uploading-progress').fadeOut(1000);
                                });
                            data.jqXHR = $(that).fileupload('send', data);
                            // 上传期间不能对input进行修改
                            $(that).find('input').attr('disabled', '');
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
                })(this),
                progress: function (e, data) {
                    // Calculate the completion percentage of the upload
                    var progress = parseInt(data.loaded / data.total * 100, 10);
                    // Update the hidden input field and trigger a change
                    // so that the jQuery knob plugin knows to update the dial
                    $(this).find('.uploading-progress .progress-bar').text(progress + '%').css('width', progress + '%').attr('aria-valuenow', progress);
                },
                done: (function (ocspuView) { 
                    return function (e, data) {
                        // 若是之前没有创建过OCSPU, 就创建， 否则仅仅修改材质图
                        if (!ocspuView._ocspu) {
                            ocspuView._ocspu = new OCSPU({
                                color: data.ocspu.color,
                                'cover-path': data.ocspu['cover-path'],
                                rgb: data.ocspu.rgb,
                                'spu-id': context.currentSPU.id,
                            });

                            ocspuView._ocspu.save(['color', 'cover-path', 'rgb', 'spu-id'], {
                                success: function (model, response, options) {
                                    ocspuView.$('.ocspu-form .uploading-progress').fadeOut(1000);
                                    dispatcher.trigger('flash', {
                                        type: 'success',
                                        msg: '成功创建OCSPU - ' + data.ocspu.color,
                                    });
                                    ocspuView.$('.panel-new-ocspu > .panel-footer .btn-ok').hide();
                                    ocspuView.$('.panel-new-ocspu > .panel-footer .btn-cancel').hide();
                                    ocspuView.$('.ocspu-form input').removeAttr('disabled');
                                    ocspuView.$('.panel-new-ocspu > .panel-heading em').text(data.ocspu.color);
                                    ocspuView.$('.panel-new-ocspu .btn-collapse').show();
                                    ocspuView.$('.panel-new-ocspu .btn-new-aspect').show();
                                    context.currentOCSPU = ocspuView._ocspu;
                                },
                                error: function () {
                                    ocspuView.$('.ocspu-form .uploading-progress').fadeOut(1000);
                                    dispatcher.trigger('flash', {
                                        type: 'error',
                                        msg: '创建OCSPU失败!', 
                                    });             
                                    ocspuView.$('.panel-new-ocspu > .panel-footer .btn-ok').removeClass('disabled');
                                    ocspuView.$('.ocspu-form input').removeAttr('disabled');
                                    ocspuView._ocspu = null;
                                }
                            });
                        } else {
                            ocspuView._ocspu.set('cover-path', data.ocspu['cover-path']);
                            ocspuView._ocspu.save(['cover-path'], {
                                success: function (model, response, options) {
                                    ocspuView.$('.ocspu-form .uploading-progress').fadeOut(1000);
                                    dispatcher.trigger('flash', {
                                        type: 'success',
                                        msg: '成功修改OCSPU材质图' + data.ocspu['cover-path'],
                                    });
                                    ocspuView.$('.ocspu-form input').removeAttr('disabled');
                                },
                                error: function () {
                                    ocspuView.$('.ocspu-form .uploading-progress').fadeOut(1000);
                                    dispatcher.trigger('flash', {
                                        type: 'error',
                                        msg: '修改OCSPU材质图失败!', 
                                    });             
                                    ocspuView.$('.ocspu-form input').removeAttr('disabled');
                                }
                            });
                            
                        }

                    }
                })(this),
                fail: (function (ocspuView) {
                    return function (e, data) {
                        $(this).find('.uploading-progress').fadeOut(1000);
                        dispatcher.trigger('flash', {
                            type: 'error',
                            msg: '创建OCSPU失败',
                        });
                        ocspuView.$('.panel-new-ocspu > .panel-footer .btn-ok').removeClass('disabled');
                        ocspuView.$('.ocspu-form input').removeAttr('disabled');
                    }
                })(this),
            });
            return this;
        },

        getOCSPU: function () {
            return this._ocspu;
        },
        
        collapse: function () {
        
        },
    });
    return OcspuView;
});
