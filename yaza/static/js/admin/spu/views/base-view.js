define(['dispatcher', 'spu/context', 'underscore', 'backbone', 'handlebars', 'text!templates/admin/spu/view.hbs', 'text!templates/admin/spu/entry.hbs', 'spectrum', 'fancybox', 'jquery-file-upload', 'underscore.string', 'js-url'], function (dispatcher, context, _, Backbone, handlebars, template, entryTemplate) {
    _.mixin(_.str.exports());
    handlebars.default.registerHelper('eq', function(a, b, opts) {
        if(a == b) // Or === depending on your needs
            return opts.fn(this);
        else
            return opts.inverse(this);
    });
    var BaseView = Backbone.View.extend({
        el: 'div',

        _template: handlebars.default.compile(template),
        _entryTemplate: handlebars.default.compile(entryTemplate),

        initialize: function (option) {
            this._parentView = option.parentView;
        },

        render: function (collapsed) {
            //collapsed? this._collapse(): this._expand();
            if (!collapsed) {
                this._expand();
            } else {
                this._collapse();
            }
            return this;
        },

        _initColorInput: function ($input, field, view) {
            $input.attr('type', 'text'); // 否则allowEmpty不会生效
            $input.spectrum({
                preferredFormat: "hex",
                chooseText: "确定",
                cancelText: "取消",
                showInput: true,
                allowEmpty: true,
                change: function (event) {
                    $(this).data('error-label').hide();
                    if (view.model.id != undefined) {
                        view.model.set(field.name, $(this).val());
                        view.model.save([field.name], {
                            success: function (model, response, options) {
                                dispatcher.trigger('flash', {
                                    type: 'success',
                                    msg: '成功修改' + field.label + '为' + model.get(field.name) + '!', 
                                });             
                            },
                            error: function () {
                                dispatcher.trigger('flash', {
                                    type: 'error',
                                    msg: '修改' + field.label + '失败!', 
                                });             
                            },
                        });
                    }
                }
            });
        },

        _initFileInput: function ($input, field, view) {
            view.$form.fileupload({
                dataType: 'json',
                url: 'http://up.qiniu.com',
                add: function (e, data) {
                    // 这里不用$input.data('error-label')是由于fileupload这个插件会替换掉$input(变成一个隐藏元素)
                    var $errorLabelEl = $(this).find('label.text-danger[data-field="' + field.name + '"]');
                    $errorLabelEl.hide();
                    var fileReader = new FileReader();
                    fileReader.onload = (function (a) {
                        return function (e) {
                            a.href = e.target.result;
                            $(a).find('img')[0].src = e.target.result;
                        };
                    })($(this).find('a.fancybox[data-field="' + field.name + '"]')[0]);
                    fileReader.readAsDataURL(data.files[0]);
                    $(this).data('data', data);
                    // 只有修改ocspu的材质图的时候， 才直接提交数据
                    if (view.model.id != undefined) {
                        $(this).find('.uploading-progress').show();
                        data.ocspu = {};
                        var jqXHR = data.submit();
                        view.$inputs.forEach(function ($input) {
                            $input.attr('disabled', '');
                        });
                        $(this).find('.uploading-progress .upload-cancel-btn').click(
                            function () {
                                jqXHR.abort();
                                $(this).find('.uploading-progress').fadeOut(1000);
                            });
                    }
                },
                submit: function (e, data) {
                    $.getJSON('/qiniu/token?bucket=yaza-spus', function (token) {
                        var postfix = data.files[0].name.match(/png|jpeg|jpg/i);
                        postfix = (postfix && postfix[0]) || '';
                        data.formData = {
                            'key': view.label + '+' + new Date().getTime() + '.' + postfix,
                            'token': token.token,
                        };
                        view.$form.find('.uploading-progress .progress-bar').text('0%').css('width', '0%').attr('aria-valuenow', 0);
                        view.$form.find('.uploading-progress').show();
                        view.$form.find('.uploading-progress .upload-cancel-btn').click(
                            function () {
                                data.abort();
                                view.$form.find('.uploading-progress').fadeOut(1000);
                            });
                            data.jqXHR = view.$form.fileupload('send', data);
                            // 上传期间不能对input进行修改
                            view.$form.find('input').attr('disabled', '');
                    }).fail(function () {
                        dispatcher.trigger('flash', {
                            type: 'error',
                            msg: '不能获取七牛的上传token', 
                        });
                        data.abort();
                    });
                    // 之前已经send了， 就不要再submit
                    return false;
                }, 
                progress: function (e, data) {
                    // Calculate the completion percentage of the upload
                    var progress = parseInt(data.loaded / data.total * 100, 10);
                    // Update the hidden input field and trigger a change
                    // so that the jQuery knob plugin knows to update the dial
                    $(this).find('.uploading-progress .progress-bar').text(progress + '%').css('width', progress + '%').attr('aria-valuenow', progress);
                },
                done: function (e, data) {
                    // 若是之前没有创建过OCSPU, 就创建， 否则仅仅修改材质图
                    if (view.model.id == undefined) {
                        var fieldNames = [];
                        for (var i=0; i < view.$inputs.length; ++i) {
                            var $input = view.$inputs[i];
                            var val = $input.val().trim();
                            var fieldName = $input.data('field');
                            fieldNames.push(fieldName);
                            view.model.set(fieldName, val);
                        }
                        // override file field
                        view.model.set(field.name, 'http://yaza-spus.qiniudn.com/' + data.formData.key);

                        if (!!view._parentView) {
                            fieldNames.push(view._parentView.nextLevel.parentRefBack);
                            view.model.set(view._parentView.nextLevel.parentRefBack, view._parentView.model.id);
                        }
                        view.model.save(fieldNames, {
                            success: function (model, response, options) {
                                dispatcher.trigger('flash', {
                                    type: 'success',
                                    msg: '成功创建' + view.label + ' - ' +  model.get(view.title) + '!', 
                                });
                                view.$form.find('.uploading-progress').fadeOut(1000);
                                view.$createBtn.hide();
                                if (!!view._parentView) {
                                    view.$cancelBtn.hide();
                                }
                                view.$title.text(model.get(view.title));
                                view.$collapseBtn.show();
                                view.$nextLevelBtn.show();
                            },
                            error: function () {
                                dispatcher.trigger('flash', {
                                    type: 'error',
                                    msg: '创建' + view.label + '失败!', 
                                });             
                                view.$createBtn.removeClass('disabled');
                            }
                        });
                    } else {
                        var path = 'http://yaza-spus.qiniudn.com/' + data.formData.key;
                        view.model.set(field.name, path);
                        var $form = $(this);
                        view.model.save([field.name], {
                            success: function (model, response, options) {
                                $form.find('.uploading-progress').fadeOut(1000);
                                dispatcher.trigger('flash', {
                                    type: 'success',
                                    msg: '成功修改' + field.label + '为' + 'http://yaza-spus.qiniudn.com/' + data.formData.key,
                                });
                                $form.find('input').removeAttr('disabled');
                            },
                            error: function () {
                                $form.find('.uploading-progress').fadeOut(1000);
                                dispatcher.trigger('flash', {
                                    type: 'error',
                                    msg: '修改' + field.name + '失败!', 
                                });             
                                $form.find('input').removeAttr('disabled');
                            }
                        });

                    }
                },
                fail: (function (view) {
                    return function (e, data) {
                        $(this).find('.uploading-progress').fadeOut(1000);
                        dispatcher.trigger('flash', {
                            type: 'error',
                            msg: '创建' + view.label + '失败',
                        });
                        view.$createBtn.removeClass('disabled');
                        $(this).find('input').removeAttr('disabled');
                    }
                })(this),
            });
        },

        _initInput: function ($input, field, view) {
            $input.keydown(function (event) {
                $(this).data('error-label').hide();
            }).keypress(function (event) {
                if (event.which != 13) {
                    return true;
                } 
                event.preventDefault();
                if (view.model.id != undefined) {
                    $(event.target).blur()
                    view.model.set(field.name, $(this).val());
                    view.model.save([field.name], {
                        success: function (model, response, options) {
                            dispatcher.trigger('flash', {
                                type: 'success',
                                msg: '成功修改' + field.label + '为' + model.get(field.name) + '!', 
                            });             
                            if (view.title == field.name) {
                                view.$title.text(model.get(field.name));
                            }
                        },
                        error: function () {
                            dispatcher.trigger('flash', {
                                type: 'error',
                                msg: '修改' + field.name + '失败!', 
                            });             
                        },
                    });
                }
            });
        },

        _expand: function () {
            this.fields.forEach(function (field) {
                field.value = this.model.id == undefined? '': this.model.get(field.name);
                field.class = field.class || 'col-md-2'
            }.bind(this));

            this.$el.html(this._template({fields: this.fields, label: this.label, 
                model: this.model.id == undefined? '': this.model.get(this.title),
                nextLevel: this.nextLevel,
                parentView: this._parentView,
            }));
            this.$panel = this.$('.panel-' + this.label);
            this.$form = this.$('.form-' + this.label);
            this.$title = this.$('.panel-' + this.label + ' > .panel-heading em');
            this.$createBtn = this.$('.panel-' + this.label + ' > .panel-footer .btn-ok');
            this.$cancelBtn = this.$('.panel-' + this.label + ' > .panel-footer .btn-cancel');
            this.$collapseBtn = this.$('.panel-' + this.label + ' > .panel-heading a.btn-collapse');
            this.$nextLevelBtn = this.$('.panel-' + this.label + ' > .panel-footer .btn-next-level');
            this.$listGroup = this.$('.panel-' + this.label + ' > .panel-body .list-group');
            if (!!this.nextLevel && this.model.id != undefined) {
                var nextLevel = this.nextLevel;
                this.nextLevel.objects(this.model).forEach(function (view) {
                    return function (model) {
                        model.fetch({
                            success: function () {
                                var $nextLevelEl = $('<div class="' + nextLevel.label + '"></div>').prependTo(this.$listGroup);
                                var nextLevelView = new nextLevel.view({
                                    el: $nextLevelEl, 
                                    model: model,
                                    parentView: view,
                                }).render(true);
                                $nextLevelEl.data('view', nextLevelView);
                            }
                        });
                    }
                }(this)); 
            }
            this.$inputs = this.fields.map(function (field) {
                var selector = '[data-field="' + field.name + '"]';
                var $input = this.$form.find('input' + selector).data('error-label', this.$form.find('label.text-danger' + selector));
                switch (field.type) {
                    case 'color':
                        this._initColorInput($input, field, this);
                        break;
                    case 'file':
                        this._initFileInput($input, field, this);
                        break; 
                    default:
                        this._initInput($input, field, this);
                }
                return $input;
            }.bind(this));
            this.$createBtn.click(function (view) {
                return function (event) {
                    event.preventDefault();
                    var fieldNames = [];
                    for (var i=0; i < view.$inputs.length; ++i) {
                        var $input = view.$inputs[i];
                        var val = $input.val().trim();
                        var fieldName = $input.data('field');
                        fieldNames.push(fieldName);
                        if (!val) {
                            $input.focus().data('error-label').show(); 
                            return false;
                        }
                        view.model.set(fieldName, val);
                    }
                    if (view.$inputs.every(function ($input) {
                        return $input.attr('type') != 'file';
                    })) {
                        if (!!view._parentView) {
                            fieldName.push(view._parentView.nextLevel.parentRefBack);
                            view.model.set(view._parentView.nextLevel.parentRefBack, view._parentView.model.id);
                        }
                        view.model.save(fieldNames, {
                            success: function (model, response, options) {
                                dispatcher.trigger('flash', {
                                    type: 'success',
                                    msg: '成功创建' + view.label + ' - ' + model.get(view.title) + '!', 
                                });
                                view.$createBtn.hide();
                                view.$title.text(model.get(view.title));
                                view.$collapseBtn.show();
                                view.$nextLevelBtn.show();
                            },
                            error: function () {
                                dispatcher.trigger('flash', {
                                    type: 'error',
                                    msg: '创建' + view.label + '失败!', 
                                });             
                                view.$createBtn.removeClass('disabled');
                            }
                        });
                    } else {
                        $(event.target).addClass('disabled');
                        var data = view.$form.data('data');
                        var jqXHR = data.submit();
                    }
                    return false;
                }
            }(this));
            this.$cancelBtn.click(function (event) {
                if (!this._parentView) {
                    location.href = decodeURIComponent($.url('?__back_url__'));   
                } else {
                    this.$el.fadeOut({
                        always: function () {
                            $(this).remove();
                        }
                    });
                }
                return false;
            }.bind(this));
            this.$collapseBtn.one('click', function (view) {
                return function (event) {
                    view.render(true); 
                }
            }(this));
            this.$nextLevelBtn.click(function (event) {
                // 若已经有一个下一级对象正在创建
                if (_(this.$listGroup.children()).any(function (el) {
                    return $(el).data('view').isNew();
                })) {
                    return;
                }
                this.$listGroup.children().each(function (i, el) {
                    $(el).data('view').render(true);
                }); 
                var $nextLevelEl = $('<div class="' + this.label + '"></div>').prependTo(this.$('.panel-' + this.label + ' > .panel-body .list-group'));
                var nextLevelView = new this.nextLevel.view({
                    el: $nextLevelEl, 
                    model: this.nextLevel.newObject(),
                    parentView: this,
                }).render();
                $nextLevelEl.data('view', nextLevelView);
            }.bind(this));
        },

        _collapse: function () {
            var obj = {
                label: this.label,
                title: this.model.get(this.title),
                fields: {},
            }; 
            this.fields.forEach(function (field) {
                obj.fields[field.name] = this.model.get(field.name);
            }.bind(this));
            this.$el.html('<li class="list-group-item">' + this._entryTemplate(obj) + '</li>'); 
            this.$expandBtn = this.$('.btn-expand');
            this.$expandBtn.one('click', function (view) {
                return function (event) {
                    view.render();
                }
            }(this));
            this.$removeBtn = this.$('.btn-remove');
            this.$removeBtn.click(function (view) {
                return function (event) {
                    if (confirm('您是否要删除' + view.label + '(' + view.model.get(view.title) + ')?')) {
                        view.model.destroy({
                            success: function (model, response) {
                                dispatcher.trigger('flash', {
                                    type: 'success',
                                    msg: '成功删除' + view.label + '(' + view.model.get(view.title) + ')!', 
                                });
                                view.$el.fadeOut({
                                    always: function () {
                                        $(this).remove();
                                    }
                                });
                            },
                            error: function (model, response) {
                                dispatcher.trigger('flash', {
                                    type: 'error',
                                    msg: '删除' + view.label + '(' + view.model.get(view.title) + ')出现错误!</br>' + _(response.responseText).escapeHTML(), 
                                });
                            }
                        });    
                    }
                }
            }(this));
        },

        isNew: function () {
            return this.model.id == undefined;
        }
    });
    return BaseView;
});
