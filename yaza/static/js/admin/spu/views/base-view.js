define(['jquery', 'dispatcher', 'admin/spu/context', 'underscore', 'backbone', 'handlebars', 'text!templates/admin/spu/view.hbs', 'text!templates/admin/spu/entry.hbs', 'spectrum', 'fancybox', 'jquery-file-upload', 'underscore.string', 'js-url', "ekko-lightbox"], function ($, dispatcher, context, _, Backbone, handlebars, template, entryTemplate) {
    _.mixin(_.str.exports());
    handlebars.default.registerHelper('eq', function (a, b, opts) {
        if (a == b) // Or === depending on your needs
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
            this._makeEntry();
            this._makePanel();
            if (!collapsed) {
                this.expand();
            } else {
                this.collapse();
            }
            return this;
        },

        expand: function () {
            this._expanded = true;
            this.$panel.show();
            this.$entry.hide();
        },

        collapse: function () {
            this._expanded = false;
            this.$entry.show();
            this.$panel.hide();
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
                    dispatcher.trigger('validate');
                    if (view.model.id != undefined) {
                        view.model.set(field.name, $(this).val());
                        view.model.save([field.name], {
                            success: function (model, response, options) {
                                dispatcher.trigger('flash', {
                                    type: 'success',
                                    msg: '成功修改' + field.label + '为' + model.get(field.name) + '!',
                                });
                            },
                            error: function (model, response) {
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
                    // 由于file-upload插件会替换掉原有的input控件，所以要
                    // 重新找回此控件对应的field
                    view.$inputs.forEach(function ($input_, index, array) {
                        if ($input_.data('field-name') === $input.data('field-name')) {
                            $input_.data('field', field);
                        }
                    }, this);
                    dispatcher.trigger('validate');
                    var fileReader = new FileReader();
                    fileReader.onload = (function (a) {
                        return function (e) {
                            a.href = e.target.result;
                            $(a).find('img')[0].src = e.target.result;
                        };
                    })($(this).find('a.fancybox[data-field-name="' + field.name + '"]')[0]);
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
                                return false;
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
                        var fieldNames = view.populateModel(data);
                        view.model.save(fieldNames, {
                            success: function (model, response, options) {
                                dispatcher.trigger('flash', {
                                    type: 'success',
                                    msg: '成功创建' + view.label + ' - ' + model.get(view.title) + '!',
                                });
                                view.$form.find('.uploading-progress').fadeOut(1000);
                                view.$createBtn.hide();
                                if (!!view._parentView) {
                                    view.$cancelBtn.hide();
                                }
                                view.$title.find('.hint').text('修改');
                                view.$title.find('em').text(model.id + ' - ' + model.get(view.title));
                                view.$entry.find('em').text(model.id + ' - ' + model.get(view.title))
                                view.$collapseBtn.show();
                                view.$nextLevelBtn.show();
                                view.$form.find('input').removeAttr('disabled');
                                view.trigger('object-created');
                            },
                            error: function () {
                                dispatcher.trigger('flash', {
                                    type: 'error',
                                    msg: '创建' + view.label + '失败!', 
                                });             
                                view.$form.find('.uploading-progress').fadeOut(1000);
                                view.$createBtn.removeClass('disabled');
                                view.$form.find('input').removeAttr('disabled');
                            }
                        });
                    } else {
                        view.model.save(view.populateModel(data, [field.name]), {
                            success: function (model, response, options) {
                                view.$form.find('.uploading-progress').fadeOut(1000);
                                dispatcher.trigger('flash', {
                                    type: 'success',
                                    msg: '成功修改' + field.label + '为' + 'http://yaza-spus.qiniudn.com/' + data.formData.key,
                                });
                                view.$form.find('input').removeAttr('disabled');
                            },
                            error: function () {
                                view.$form.find('.uploading-progress').fadeOut(1000);
                                dispatcher.trigger('flash', {
                                    type: 'error',
                                    msg: '修改' + field.name + '失败!',
                                });             
                                view.$form.find('input').removeAttr('disabled');
                            }
                        });

                    }
                },
                fail: (function (view) {
                    return function (e, data) {
                        $(this).find('.uploading-progress').fadeOut(1000);
                        if (view.model.id == undefined) {
                            dispatcher.trigger('flash', {
                                type: 'error',
                                msg: '创建' + view.label + '失败',
                            });
                            view.$createBtn.removeClass('disabled');
                        }
                        $(this).find('input').removeAttr('disabled');
                        return false;
                    }
                })(this),
            });
        },

        _initInput: function ($input, field, view) {
            $input.keyup(function (event) {
                dispatcher.trigger('validate');
                $(this).focus();
                return true;
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
                                view.$title.find('em').text(model.id + ' - ' + model.get(field.name));
                                view.$entry.find('em').text(model.id + ' - ' + model.get('view.title'));
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

        hasError: function () {
            return this.$entry.find('.fa-bug').length > 0;
        },

        validate: function () {
            var ok = true;
            for (var i=0; i < this.$inputs.length; ++i) {
                var $input = this.$inputs[i];
                var val = $input.val().trim();
                var inputTest = true;
                if ($input.attr('type') != 'file') {
                    if (!val) {
                        inputTest = false;
                    }
                } else {
                    if (this.model.id == undefined) {
                        if (!val) {
                            inputTest = false;
                        }
                    } else {
                        var href = this.$form.find('a.fancybox[data-field-name="' + $input.data('field-name') + '"]').attr('href');
                        if (!href) {
                            inputTest = false;
                        }
                    }
                }
                if (!inputTest) {
                    this.$form.find('.text-danger[data-field-name=' + $input.data('field-name') + ']').show();
                    ok = false;
                } else {
                    this.$form.find('.text-danger[data-field-name=' + $input.data('field-name') + ']').hide();
                }
            }
            for (var i=0; i < this.$listGroup.children().length; ++i) {
                if (!$(this.$listGroup.children()[i]).data('view').validate()) {
                    ok = false; 
                }
            }
            if (!ok) {
                if (!this.hasError()) {
                    var $bugEl = $('<i class="fa fa-bug"></i>');
                    this.$entry.prepend($bugEl).addClass('list-group-item-warning'); 
                    this.$('.panel-' + this.label + ' > .panel-heading').prepend($bugEl.clone());
                    this.$panel.addClass('panel-danger').removeClass('panel-default');
                }
            } else {
                this.$entry.removeClass('list-group-item-warning').find('.fa-bug').remove();
                this.$('.panel-' + this.label + ' > .panel-heading').find('.fa-bug').remove();
                this.$panel.addClass('panel-default').removeClass('panel-danger');
            }


            return ok;
        },


        _makePanel: function () {
            this.fields.forEach(function (field) {
                field.value = this.model.id == undefined ? '' : this.model.get(field.name);
                field.class = field.class || 'col-md-2'
            }.bind(this));

            this.$el.append(this._template({fields: this.fields, label: this.label, 
                model: this.model.id == undefined?  '': {title: this.model.get(this.title), id: this.model.id },
                nextLevel: this.nextLevel,
                parentView: this._parentView,
            }));
            this.$panel = this.$('.panel-' + this.label);
            this.$form = this.$('.form-' + this.label);
            this.$title = this.$('.panel-' + this.label + ' > .panel-heading .title');
            this.$createBtn = this.$('.panel-' + this.label + ' > .panel-footer .btn-ok');
            this.$cancelBtn = this.$('.panel-' + this.label + ' > .panel-footer .btn-cancel');
            this.$collapseBtn = this.$('.panel-' + this.label + ' > .panel-heading a.btn-collapse');
            this.$nextLevelBtn = this.$('.panel-' + this.label + ' > .panel-footer .btn-next-level');
            this.$listGroup = this.$('.panel-' + this.label + ' > .panel-body .list-group');
            this.$inputs = this.fields.map(function (field) {
                var selector = '[data-field-name="' + field.name + '"]';
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
                $input.data('field', field);
                return $input;
            }.bind(this));
            this.$createBtn.click(function (view) {
                return function (event) {
                    event.preventDefault();
                    if (!view.validate()) {
                        return false;
                    }

                    if (view.$inputs.every(function ($input) {
                        return $input.attr('type') != 'file';
                    })) {
                        view.model.save(view.populateModel(), {
                            success: function (model, response, options) {
                                dispatcher.trigger('flash', {
                                    type: 'success',
                                    msg: '成功创建' + view.label + ' - ' + model.get(view.title) + '!',
                                });
                                view.$createBtn.hide();
                                view.$title.find('.hint').text('修改');
                                view.$title.find('em').text(model.get(model.id + ' - ' + view.title));
                                view.$entry.find('em').text(model.id + ' - ' + model.get('view.title'));
                                view.$collapseBtn.show();
                                view.$nextLevelBtn.show();
                                view.trigger('object-created');
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
                            dispatcher.trigger('validate');
                        }
                    });
                }
                return false;
            }.bind(this));
            this.$collapseBtn.on('click', function (view) {
                return function (event) {
                    view.collapse();
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
                    $(el).data('view').collapse();
                }); 
                var $nextLevelEl = $('<div class="' + this.label + '"></div>').prependTo(this.$listGroup);
                var nextLevelView = new this.nextLevel.view({
                    el: $nextLevelEl,
                    model: this.nextLevel.newObject(),
                    parentView: this,
                });
                nextLevelView.on('loaded', function () {
                    dispatcher.trigger('validate'); 
                });
                $nextLevelEl.data('view', nextLevelView);
                nextLevelView.render();
            }.bind(this));
            if (!!this.nextLevel && this.model.id != undefined && this.nextLevel.objects(this.model).length > 0) {
                nextLevelModels = this.nextLevel.objects(this.model);
                var d = function (view, nextLevelViewsLength) {
                    var ret = $.Deferred(); 
                    var l = [];
                    ret.progress(function (arg) {
                        l.push(arg);
                        if (l.length == nextLevelViewsLength) {
                            view.trigger('loaded');
                        }
                    });
                    return ret;
                }(this, nextLevelModels.length);
                var nextLevel = this.nextLevel;
                nextLevelModels.forEach(function (view) {
                    return function (model) {
                        model.fetch({
                            success: function () {
                                var $nextLevelEl = $('<div class="' + nextLevel.view.prototype.label + '"></div>').appendTo(view.$listGroup);
                                var nextLevelView = new nextLevel.view({
                                    el: $nextLevelEl,
                                    model: model,
                                    parentView: view,
                                });
                                nextLevelView.on('loaded', function () {
                                    d.notify(1);
                                });
                                $nextLevelEl.data('view', nextLevelView);
                                nextLevelView.render(!view._childrenExpaned);
                            },
                            error: function (model, response) {
                                dispatcher.trigger('flash', {
                                    type: 'error',
                                    msg: '不能加载' + nextLevel.label + '(' +  model.id + ')!</br>' + _(response.responseText).escapeHTML(),
                                });
                            }
                        });
                    }
                }(this));
            } else {
                console.log(this.label + '-' + this.model.id +  ' loaded');
                this.trigger('loaded');
            }
        },

        _makeEntry: function () {
            this._expanded = false;
            var obj = {
                label: this.label,
                title: this.model.get(this.title),
                fields: {},
                id: this.model.id,
            }; 
            this.fields.forEach(function (field) {
                obj.fields[field.name] = this.model.get(field.name);
            }.bind(this));
            this.$el.append('<li class="list-group-item">' + this._entryTemplate(obj) + '</li>');
            this.$entry = this.$('.list-group-item');
            this.$expandBtn = this.$('.btn-expand');
            this.$expandBtn.on('click', function (view) {
                return function (event) {
                    view.expand();
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
                                        dispatcher.trigger('validate');
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
        },

        populateModel: function (data, fieldNames) {
            var ret = [];
            for (var i=0; i < this.$inputs.length; ++i) {
                var $input = this.$inputs[i];
                var val = $input.val().trim();
                var fieldName = $input.data('field-name');
                if (!fieldNames || _(fieldNames).contains(fieldName)) {
                    ret.push(fieldName);
                    if ($input.attr('type') != 'file') {
                        this.model.set(fieldName, val);
                    } else {
                        var path = 'http://yaza-spus.qiniudn.com/' + data.formData.key;
                        this.model.set(fieldName, path);
                    }
                }
            }
            if (!!this._parentView) {
                ret.push(this._parentView.nextLevel.parentRefBack);
                this.model.set(this._parentView.nextLevel.parentRefBack, this._parentView.model.id);
            }
            return ret;
        },

        enable: function () {
            this.$inputs.forEach(function ($input) {
                switch ($input.data('field').type) {
                    case 'file':
                        // 由于此时$input已经被file-upload插件替换掉了
                        this.$form.find(':file[data-field-name="' + $input.data('field-name') + '"]').parent().removeClass('disabled');
                        break;
                    case 'rgb':
                        $input.spectrum();
                        break;
                    default:
                        $input.removeAttr('disabled');
                } 
            }, this);
            this.$nextLevelBtn.removeClass('disabled');
            this.$removeBtn.removeClass('disabled');
            this.$listGroup.children().each(function (idx, el) {
                $(el).data('view').enable();
            })
        },

        disable: function () {
            this.$inputs.forEach(function ($input) {
                switch ($input.data('field').type) {
                    case 'file':
                        // 由于此时$input已经被file-upload插件替换掉了
                        this.$form.find(':file[data-field-name="' + $input.data('field-name') + '"]').parent().addClass('disabled');
                        break;
                    case 'color':
                        $input.spectrum({
                            disabled: true,
                        });
                        break;
                    default:
                        $input.attr('disabled', '');
                } 
            }, this);
            this.$nextLevelBtn.addClass('disabled');
            this.$removeBtn.addClass('disabled');
            this.$listGroup.children().each(function (idx, el) {
                $(el).data('view').disable();
            })
        }
    });
    return BaseView;
});
