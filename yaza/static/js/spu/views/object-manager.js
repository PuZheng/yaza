define(['backbone', 'handlebars', 'text!templates/object-manager.hbs',
    'text!templates/object-manager-item.hbs', 'dispatcher'],
    function (Backbone, handlebars, template, itemTemplate, dispatcher) {
        var MAX_LENGTH = 10;

        var ObjectManager = Backbone.View.extend({
            _itemTemplate: handlebars.default.compile(itemTemplate),
            _template: handlebars.default.compile(template),

            events: {
                'click button.remove': function (evt) {
                    if (confirm("确认删除该图片吗？")) {
                        var parent = $(evt.currentTarget).parents(".list-group-item");
                        var im = parent.data('object');
                        var controlGroup = parent.data('control-group');
                        [im, controlGroup].forEach(function (node) {
                            var layer = node.getLayer();
                            node.destroy();
                            layer.draw();
                        });
                        dispatcher.trigger('update-hotspot', this._imageLayer);
                        parent.remove();
                        this.$('.list-group-item:first').click();
                        this._setupButtons();
                        return false;
                    }
                },
                'click button.visible-btn': function (evt) {
                    var parent = $(evt.currentTarget).parents('.list-group-item');
                    $(evt.currentTarget).find('.fa-ban').toggle();
                    var visible = !$(evt.currentTarget).find('.fa-ban').is(':visible');
                    parent.data('control-group').setAttr('hidden', !visible);
                    parent.data('object').setAttr('hidden', !visible);
                    if (visible) {
                        parent.data('control-group').show();
                        parent.data('object').show();
                    } else {
                        parent.data('control-group').hide();
                        parent.data('object').hide();
                    }
                    parent.data('control-group').getLayer().draw();
                    parent.data('object').getLayer().draw();
                    return false;
                },
                'click button.up-btn': function (evt) {
                    var parent = $(evt.currentTarget).parents('.list-group-item');
                    var prevItem = parent.prev('.list-group-item');
                    this._exchangeImage(parent, prevItem);
                    return false;
                },
                'click button.down-btn': function (evt) {
                    var parent = $(evt.currentTarget).parents('.list-group-item');
                    var nextItem = parent.next('.list-group-item');
                    this._exchangeImage(parent, nextItem);
                    return false;
                },
                'click .column': function (evt) {
                    dispatcher.trigger('active-object', $(evt.currentTarget).data('control-group'));
                },
                'dragstart .column': function (evt) {
                    $(evt.currentTarget).addClass("moving");
                    this._dragSrcEl = evt.currentTarget;
                    evt.originalEvent.dataTransfer.effectAllowed = 'move';
                },
                'dragend .column': function (evt) {
                    $(".list-group-item").removeClass("over").removeClass("moving").removeClass("bg-info");
                },
                'dragover .column': function (evt) {
                    evt.stopPropagation && evt.stopPropagation();
                    evt.originalEvent.dataTransfer.dropEffect = 'move';
                    return false;
                },
                'dragleave .column': function (evt) {
                    $(evt.currentTarget).removeClass("over").removeClass('bg-info');
                },
                'dragenter .column': function (evt) {
                    $(evt.currentTarget).addClass("over").addClass('bg-info');
                },
                'drop .column': function (evt) {
                    evt.stopPropagation && evt.stopPropagation();

                    if (evt.currentTarget != this._dragSrcEl) {
                        var items = $(".object-manager .list-group-item");
                        if (items.index(evt.currentTarget) < items.index(this._dragSrcEl)) {
                            $(evt.currentTarget).before($(this._dragSrcEl));
                        } else {
                            $(evt.currentTarget).after($(this._dragSrcEl));
                        }
                        this._setupButtons();
                        this._orderNodes();
                        dispatcher.trigger('update-hotspot', this._imageLayer);
                    }

                    return false;
                }

            },

            replace: function (im, controlGroup, oldIm, oldControlGroup) {
                var objectManager = this;
                this.$('.column').each(function () {
                    if ($(this).data('object') == oldIm) {
                        $(this).data('object', im);
                        $(this).data('control-group', controlGroup);
                        $(this).html($(objectManager._itemTemplate({
                            src: im.getImage().src,
                            title: im.name(),
                        })).html());
                    }
                });
            },

            render: function () {
                this.$el.append(this._template());
                this._$container = this.$('.list-group');
                return this;
            },

            add: function (im, controlGroup) {
                var name = im.name();
                if (name.length > MAX_LENGTH) {
                    name = name.substr(0, MAX_LENGTH - 3) + "...";
                }
                // 默认新增的对象要选中
                $(this._itemTemplate({
                    src: im.getImage().src,
                    name: name,
                    title: im.name(),
                })).prependTo(this._$container).data('object', im).data('control-group', controlGroup).click();

                var a = $('a[data-title="' + im.name() + '"]');
                //截取图片长度
                var img_width = Math.min(a.width() - a.find(".pull-right").width() - a.find("span").width(), a.find("img").width());
                a.find("img").css("clip", "rect(0 " + img_width + "px 36px 0");
                // 偏移文字
                a.find("span:not(.fa-stack)").css("left", (img_width + 10) + "px");
                this._setupButtons();
                this._imageLayer = im.getLayer();
            },

            _setupButtons: function () {
                this.$("button.up-btn").attr("disabled", false).show();
                this.$("button.down-btn").attr("disabled", false).show();

                if (this.$(".list-group-item").size() > 1) {
                    this.$("button.up-btn:first").attr("disabled", true);
                    this.$("button.down-btn:last").attr("disabled", true);
                } else {
                    this.$("button.up-btn").hide();
                    this.$("button.down-btn").hide();
                }
            },

            empty: function () {
                this._$container.find('.list-group-item').remove();
            },

            _exchangeImage: function (source, target) {
                if (target.length == 0) {
                    return;
                }
                var playGround = this;

                var sourceTop = source.position().top;
                var targetTop = target.position().top;
                // 产生交换动画, 算法是: 隐藏原有的dom element, 创建两个
                // clone, 这两个clone完成位置交换的动画. 动画完毕后,
                // 删除clone, 并且修改html dom
                source.css('visibility', 'hidden');
                target.css('visibility', 'hidden');
                source.clone().insertAfter(source).css({
                    position: 'absolute',
                    visibility: 'visible',
                    top: sourceTop,
                    width: this._$container.width()  // 必须设置width, 否则长度错误, 我也不知道为什么
                }).animate({
                    top: targetTop
                }, 200, function () {
                    $(this).remove();
                    if (sourceTop < targetTop) {
                        source.insertAfter(target).css('visibility', 'visible');
                    } else {
                        source.insertBefore(target).css('visibility', 'visible');
                    }
                });
                target.clone().insertAfter(target).css({
                    position: 'absolute',
                    visibility: 'visible',
                    top: targetTop,
                    width: this._$container.width() // 必须设置width, 否则长度错误, 我也不知道为什么
                }).animate({
                    top: sourceTop
                }, 200, function (objectManager) {
                    return function () {
                        $(this).remove();
                        target.css('visibility', 'visible');
                        objectManager._setupButtons();
                        objectManager._exchangeNode(source.data('object'),
                            target.data('object'));
                        objectManager._exchangeNode(source.data('control-group'),
                            target.data('control-group'));
                        dispatcher.trigger('update-hotspot', objectManager._imageLayer);
                    };
                }(this));
            },

            _exchangeNode: function (src, dest) {
                var temp = src.getZIndex();
                src.setZIndex(dest.getZIndex());
                dest.setZIndex(temp);
                src.getLayer().draw();
            },

            _orderNodes: function () {
                $(this.$('.list-group-item').get().reverse()).each(function (index) {
                    $(this).data('object').setZIndex(index);
                    $(this).data('control-group').setZIndex(index);
                });
                this._imageLayer.draw();
            },

            activeObjectIndicator: function (controlGroup) {
                this.$('.column').removeClass('active-object');
                this.$('.column').each(function () {
                    if ($(this).data('control-group') == controlGroup) {
                        $(this).addClass('active-object');
                    }
                });
            },

            activeObject: function () {
                return this.$('.list-group-item.active-object');
            }

        });
        return ObjectManager;
    });
