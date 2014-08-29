define([
        'jquery',
        'backbone',
        'underscore',
        'handlebars',
        'dispatcher',
        'text!templates/gallery.hbs',
        'text!templates/uploading-progress.hbs',
        'text!templates/uploading-success.hbs',
        'text!templates/uploading-fail.hbs',
        'spu/collections/design-images',
        'cookies-js',
        'spu/config',
        'FileAPI',
        'utils/lazy-load',
        'underscore.string',
        'jquery.iframe-transport',
        'jquery-file-upload',
    ],
    function ($, Backbone, _, handlebars, dispatcher, galleryTemplate, uploadingProgressTemplate, uploadingSuccessTemplate, uploadingFailTemplate, DesignImages, Cookies, config, 
             FileAPI) {

        _.mixin(_.str.exports());

        function formatFileSize(bytes) {
            if (typeof bytes !== 'number') {
                return '';
            }

            if (bytes >= 1000000000) {
                return (bytes / 1000000000).toFixed(2) + ' GB';
            }

            if (bytes >= 1000000) {
                return (bytes / 1000000).toFixed(2) + ' MB';
            }

            return (bytes / 1000).toFixed(2) + ' KB';
        }

        var SelectImageModal = Backbone.View.extend({

            render: function () {
                this.$('.nav-tabs a:first').tab('show');

                var view = this;
                this.$el.on('shown.bs.modal', function (e) {
                    if (!view._designImagesPerPage) {
                        var fakeImage = $('<li><div class="thumbnail"></div></li>');
                        fakeImage = $(fakeImage.appendTo(view.$('.thumbnails'))[0]).hide();
                        var imagesOneRow = Math.floor(view.$('.thumbnails').width() / fakeImage.width());
                        var imagesOneColumn = Math.ceil(view.$('.thumbnails').height() / fakeImage.height());
                        fakeImage.remove();
                        view._designImagesPerPage = imagesOneColumn * imagesOneRow;
                    }

                    if (!view.$('.builtin-pics img').length) {
                        view._selectTag(view._currentTagId || 0);
                    }

                    if (!view.$('.customer-pics img').length) {
                        view._renderUserPics();
                    }

                    var templateProgress = handlebars.default.compile(uploadingProgressTemplate);
                    var templateSuccess = handlebars.default.compile(uploadingSuccessTemplate);
                    var templateFail = handlebars.default.compile(uploadingFailTemplate);

                    view.$('.upload-img-form').fileupload({
                        dataType: 'json',
                        url: 'http://up.qiniu.com',
                        add: function (e, data) {
                            $('.nav-tabs a:last').tab('show');
                            $.getJSON('/qiniu/token?bucket=yaza-spus', function (token) {
                                var postfix = data.files[0].name.match(/png|jpeg|jpg/i);
                                postfix = (postfix && postfix[0]) || '';
                                view.$('.uploading-progress').html(
                                    templateProgress({
                                        fileSize: formatFileSize(data.files[0].size)
                                    }));
                                view.$('.uploading-progress .progress-bar').text('0%').css('width', '0%').attr('aria-valuenow', 0);
                                view.$('.uploading-progress').show();
                                view.$('.uploading-progress .upload-cancel-btn').click(
                                    function () {
                                        data.abort();
                                        view.$('.uploading-progress').fadeOut(1000);
                                        return false;
                                    });
                                data.formData = {
                                    'key': 'ugc.' + new Date().getTime() + '.' + postfix + '.duri',
                                    'token': token.token,
                                };
                                debugger;
                                FileAPI.readAsDataURL(data.files[0], function (e) {
                                    if (e.type === 'load') {
                                        view.$('.uploading-progress img').attr('src', e.result);
                                        data.files[0] = new Blob([e.result], {
                                            type: 'text/plain',
                                        });
                                        view.$('.upload-img-form').fileupload('send', data);
                                    }
                                });
                            }).fail(function () {
                                // TODO unhandled
                                dispatcher.trigger('flash', {
                                    type: 'error',
                                    msg: '不能获取七牛的上传token',
                                });
                                data.abort();
                            });
                        },
                        progress: function (e, data) {
                            // Calculate the completion percentage of the upload
                            var progress = parseInt(data.loaded / data.total * 100, 10);

                            // Update the hidden input field and trigger a change
                            // so that the jQuery knob plugin knows to update the dial
                            view.$('.uploading-progress .progress-bar').text(progress + '%').css('width', progress + '%');
                        },
                        done: function (e, data) {
                            url = 'http://' + config.QINIU_CONF.SPU_IMAGE_BUCKET + '.qiniudn.com/' + data.formData.key;
                            view.$('.uploading-progress').html(templateSuccess());
                            view.$('.uploading-progress').fadeOut(1000);
                            FileAPI.readAsText(data.files[0], function (e) {
                                if (e.type === 'load') {
                                    Cookies.set('upload-images', url + '||' + (Cookies.get('upload-images') || ''), {expires: 7 * 24 * 3600});
                                    var overrides = {};
                                    overrides.url = e.result;
                                    view._renderUserPics(overrides);
                                    $(".thumbnails .thumbnail").removeClass("selected");
                                    $(".customer-pics").find(".thumbnail:first").addClass("selected");
                                }
                            });

                        },
                        fail: function (e, data) {
                            view.$('.uploading-progress').html(templateFail());
                            view.$('.uploading-progress').fadeOut(1000);
                        }
                    });
                });

                this.$('.thumbnails').scroll(function (playGround) {
                    var lastScroll = 0;
                    return function (evt) {
                        var lastImg = $(evt.target).find('img:last');
                        // 必须判断是否向下, 因为当最后一页的时候, 向上滚动不能触发加载图片
                        if ($(this).scrollTop() > lastScroll && lastImg.offset().top + lastImg.height() / 2 < this.getBoundingClientRect().bottom) {
                            if (playGround._noMoreDesignImages) {
                                playGround.$('.toast').show();
                                setInterval(function () {
                                    playGround.$('.toast').fadeOut();
                                }, 1000);
                            } else {
                                playGround._loadMoreDesignImages();
                            }
                        }
                        lastScroll = $(this).scrollTop();
                        return false;
                    }
                }(this));

                return this;
            },

            events: {
                'click .gallery .thumbnail': function (evt) {
                    this.$(".gallery .thumbnail").removeClass("selected");
                    this.$(evt.currentTarget).addClass("selected");
                },
                'dblclick .gallery .thumbnail': function (evt) {
                    this.$(".gallery .thumbnail").removeClass("selected");
                    this.$(evt.currentTarget).addClass("selected");
                    this.$el.modal('hide');
                    // 注意，ie9-由于不支持css transition, hide的同时就会触发hidden.bs.modal,
                    // 会造成假死， 所以不能在hide之前绑定这个事件， 而是之后
                    if (Modernizr.csstransitions) {
                        this.$el.one('hidden.bs.modal', function () {
                            var $img = this.$(".gallery .thumbnail.selected img");
                            dispatcher.trigger('design-image-selected', {
                                url: $img.data("pic-url") || $img.attr('src'),
                                title: $img.data('title'),
                                designImageId: $img.data("design-image-id"),
                            });
                        }.bind(this));
                    } else {
                        setTimeout(function () {
                            var $img = this.$(".gallery .thumbnail.selected img");
                            dispatcher.trigger('design-image-selected', {
                                url: $img.data("pic-url") || $img.attr('src'),
                                title: $img.data('title'),
                                designImageId: $img.data("design-image-id"),
                            });
                        }.bind(this), 50);
                    }
                },
                'click .btn-ok': function (evt) {
                    this.$el.one('hidden.bs.modal', function () {
                        var $img = this.$(".gallery .thumbnail.selected img");
                        dispatcher.trigger('design-image-selected', {
                            url: $img.data("pic-url") || $img.attr('src'),
                            title: $img.data('title'),
                            designImageId: $img.data("design-image-id"),
                        });
                    }.bind(this));
                    this.$el.modal('hide');
                },
                'click .btn-tag': function (evt) {
                    if (this.$('.tags-list').is(':visible')) {
                        this.$('.tags-list').hide();
                    } else {
                        this.$('.tags-list').css({
                            width: '0px',
                            height: '90px',
                            position: 'absolute'
                        }).show().animate({
                            width: "100%",
                            height: '90px'
                        });
                    }
                },
                'click .tags-list button.close': function (evt) {
                    this.$('.tags-list').hide();
                },
                'click .tags-list a.tag': function (evt) {
                    var tagId = $(evt.currentTarget).data('tag-id');
                    this._selectTag(tagId, $(evt.currentTarget).find('b').text());
                    return false;
                },
            },

            _renderUserPics: function (overrides) {
                var template = handlebars.default.compile(galleryTemplate);
                var rows = [];
                var upload_images = (Cookies.get('upload-images') || '').trim();
                if (!!upload_images) {
                    upload_images = _.filter(upload_images.split('||'), function (val) {
                        return !!val;
                    });
                    var row = [];
                    _.each(upload_images, function (img, idx) {
                        if (idx > 0 && idx % 4 == 0) {
                            rows.push(row);
                            row = [];
                        }
                        row.push(img);

                    });
                    if (row.length > 0) {
                        rows.push(row);
                    }
                }
                var gallery = $(template(rows));
                this.$('.customer-pics').html(gallery);

                //加载duri的图片
                this.$(".customer-pics").find("img").each(function (idx, item) {
                    if (!!overrides && overrides[item.src]) {
                        item.src = overrides[item.src];
                    } else {
                        $(item).lazyLoad();
                    }
                });
            },

            _selectTag: function (tagId, tag) {
                this.$('.tags-list').fadeOut();
                if (this._currentTagId == tagId) {
                    return;
                }
                this._currentTagId = tagId;
                this.$(".builtin-pics .thumbnails").empty();
                this.$("span.selected-tag").text(tag || '不限标签');
                this._loadMoreDesignImages().done(function () {
                    if (this.$("ul.thumbnails .thumbnail.selected img").length == 0) {
                        this.$(".builtin-pics .thumbnail:first").addClass("selected");
                    }
                }.bind(this));
            },

            _loadMoreDesignImages: function (after) {
                var d = $.Deferred();
                var designImages = new DesignImages(this._currentTagId, this.$('.builtin-pics .thumbnails img').length / this._designImagesPerPage, this._designImagesPerPage);
                designImages.fetch({reset: true});
                designImages.on('reset', function (view) {
                    return function (evt) {
                        var thumbnails = view.$(".builtin-pics .thumbnails");
                        this.each(function (element, index, list) {
                            var s = '<li><div class="thumbnail" style="background-color:%s">' +
                                '<img src="%s" alt="%s" data-title="%s" data-pic-url="%s" data-design-image-id="%s"></img>' +
                                '</div></li>';
                            var thumbnail = element.get('thumbnail');
                            if ($.browser.name == "msie" && $.browser.versionNumber !== 11) {
                                thumbnail = element.get("duri");
                            }
                            var e = $(_.sprintf(s,
                                element.get("backgroundColor"),
                                thumbnail,
                                element.get('title'),
                                element.get('title'),
                                element.get('picUrl'),
                                element.get('id')
                            ));
                            thumbnails.append(e);
                            $(e).find('img').lazyLoad();
                        });
                        view._noMoreDesignImages = (view.$('.builtin-pics .thumbnails img').length >= designImages.totalCnt);
                        d.resolve(true);
                    }
                }(this));
                return d;
            }

        });

        return SelectImageModal;
    });
