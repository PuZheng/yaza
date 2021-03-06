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
                        dispatcher.trigger('update-preview');
                        parent.remove();
                        if (this.$('.list-group-item').length > 0) {
                            this.$('.list-group-item:first').click();
                        } else {
                            dispatcher.trigger('active-object');
                        }
                        this._setupButtons();
                        return false;
                    }
                },
                'click button.visible-btn': function (evt) {
                    var parent = $(evt.currentTarget).parents('.list-group-item');
                    $(evt.currentTarget).find('.fa-ban').toggle();
                    var visible = !$(evt.currentTarget).find('.fa-ban').is(':visible');
                    if (visible) {
                        parent.data('control-group').draggable(true);
                        this._orderNodes();
                        parent.data('object').show();
                    } else {
                        parent.data('control-group').draggable(false);
                        parent.data('control-group').moveToBottom();
                        parent.data('object').hide();
                    }
                    parent.data('control-group').getLayer().draw();
                    parent.data('object').getLayer().draw();
                    dispatcher.trigger('update-preview');
                    if (visible) {
                        if (!this.$(".active-object")[0]) {
                            //如果没有active-object，默认激活当前item
                            dispatcher.trigger('active-object', parent.data('control-group'));
                        }
                    } else {
                        //说明当前item是被选中的
                        if (parent.hasClass("active-object")) {
                            //所有的未隐藏的item
                            var visibleItems = _.filter(this.$("a.column"), function (item) {
                                return $(item).data("object").visible();
                            });
                            if (visibleItems.length != 0) {
                                //说明除当前item外还有别的item
                                $(visibleItems[0]).click();
                            } else {
                                // 全不选所有的对象
                                parent.removeClass("active-object");
                                dispatcher.trigger('active-object');
                            }
                        }
                    }
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
                    if(!$(evt.currentTarget).data("object").visible()) {
                        return false;
                    }
                    dispatcher.trigger('active-object', $(evt.currentTarget).data('control-group'));
                },
                'dragstart .column': function (evt) {
                    if (!$(evt.currentTarget).data('object').visible()) {
                        return false;
                    }
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
                    if (!$(evt.currentTarget).data('object').visible()) {
                        return false;
                    }
                    $(evt.currentTarget).addClass("over").addClass('bg-info');
                },
                'drop .column': function (evt) {
                    evt.stopPropagation && evt.stopPropagation();
                    if (!$(evt.currentTarget).data('object').visible()) {
                        return false;
                    }

                    if (evt.currentTarget != this._dragSrcEl) {
                        var items = $(".object-manager .list-group-item");
                        if (items.index(evt.currentTarget) < items.index(this._dragSrcEl)) {
                            $(evt.currentTarget).before($(this._dragSrcEl));
                        } else {
                            $(evt.currentTarget).after($(this._dragSrcEl));
                        }
                        this._setupButtons();
                        this._orderNodes();
                        dispatcher.trigger('update-preview');
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
                        $(this).html(objectManager._renderImage(im).html());
                        $(this).find('img').load(function (objectManager, item) {
                            return function (evt) {
                                objectManager._formatItem(item);
                            }
                        }(objectManager, $(this)));
                        objectManager._setupButtons();
                        $(this).click();
                    }
                });
            },

            _renderImage: function (image) {
                var name = image.name();
                if (name.length > MAX_LENGTH) {
                    name = name.substr(0, MAX_LENGTH - 3) + "...";
                }

                var ret= $(this._itemTemplate({
                    src: image.getImage().src,
                    name: name,
                    title: image.name(),
                    default: image.getAttr('default'),
                    visible: image.isVisible()
                }));
                return ret;
            },

            _formatItem: function (item) {
                //截取图片长度
                // 在chrome中，即使图片已经load，但是它的width依旧是0，所以强制设置最小的width为36px
                imgWidth = Math.min(item.width() - item.find(".pull-right").width() - item.find("span").width(), item.find("img").width());
                item.find("img").css("clip", "rect(0 " + imgWidth + "px 36px 0");

                // 偏移文字
                item.find("span:not(.fa-stack)").css("left", (imgWidth + 10) + "px");
            },


            render: function () {
                this.$el.append(this._template());
                this._$container = this.$('.list-group');
                return this;
            },

            add: function (im, controlGroup) {
                // 默认新增的对象要选中
                var item = this._renderImage(im).prependTo(this._$container).data('object', im).data('control-group', controlGroup);
                item.click();
                item.find('img').load(function (objectManager, item) {
                    return function (evt) {
                        objectManager._formatItem(item);
                    }
                }(this, item));
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
                if (target.length == 0 || !source.data('object').visible() || !target.data('object').visible()) {
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
                        dispatcher.trigger('update-preview');
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
