(function (mods) {
    define(mods, function (Backbone, _, handlebars, uploadingProgressTemplate, uploadingSuccessTemplate, uploadingFailTemplate, galleryTemplate, Cookies) {

        handlebars.default.registerHelper("eq", function (target, source, options) {
            if (target === source) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });

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

        function _selectFirstCustomerImg() {
            $(".thumbnails .thumbnail").removeClass("selected");
            $("#customer-pics").find(".thumbnail:first").addClass("selected");
        }

        var PlayGround = Backbone.View.extend({
            events: {
            },
            render: function () {
                var playGround = this;
                this.$('.add-img-modal').on('show.bs.modal', this._selectFirstIfSelectedEmpty).on('shown.bs.modal',function (e) {

                    var templateProgress = handlebars.default.compile(uploadingProgressTemplate);
                    var templateSuccess = handlebars.default.compile(uploadingSuccessTemplate);
                    var templateFail = handlebars.default.compile(uploadingFailTemplate);
                    $(this).find('.upload-img-form').fileupload({
                        dataType: 'json',
                        add: function (e, data) {
                            $('.nav-tabs a:last').tab('show');
                            $(this).find('.uploading-progress').html(
                                templateProgress({
                                    fileSize: formatFileSize(data.files[0].size),
                                })).show();
                            var reader = new FileReader();
                            reader.onload = _.bind(function (e) {
                                $(this).find('.uploading-progress img').attr('src', e.target.result);
                            }, this);
                            reader.readAsDataURL(data.files[0]);
                            // Automatically upload the file once it is added to the queue
                            var jqXHR = data.submit();
                            $(this).find('.uploading-progress .upload-cancel-btn').click(
                                function () {
                                    jqXHR.abort();
                                    $(this).find('.uploading-progress').fadeOut(1000);
                                });
                        },
                        progress: function (e, data) {
                            // Calculate the completion percentage of the upload
                            var progress = parseInt(data.loaded / data.total * 100, 10);

                            // Update the hidden input field and trigger a change
                            // so that the jQuery knob plugin knows to update the dial
                            $(this).find('.uploading-progress .progress-bar').text(progress + '%').css('width', progress + '%');
                        },
                        done: function (e, data) {
                            $(this).find('.uploading-progress').html(templateSuccess());
                            $(this).find('.uploading-progress').fadeOut(1000);
                            Cookies.set('upload-images',
                                data.result.filename + '||' + (Cookies.get('upload-images') || ''), {expires: 7 * 24 * 3600});
                            playGround._renderGallery();
                            _selectFirstCustomerImg();
                        },
                        fail: function (e, data) {
                            $(this).find('.uploading-progress').html(templateFail());
                            $(this).find('.uploading-progress').fadeOut(1000);
                        }
                    });
                }).on("hidden.bs.modal", function () {
                    alert("选择了" + $(".thumbnail.selected img").attr("src"));
                });
                this._renderGallery();
            },

            _renderGallery: function () {
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
                this.$('.add-img-modal #customer-pics').html(gallery);
            },

            _selectFirstIfSelectedEmpty: function () {
                if ($(".thumbnail.selected img").length == 0) {
                    var upload_images = (Cookies.get('upload-images') || '').trim();
                    if (!!upload_images) {
                        _selectFirstCustomerImg();
                    } else {
                        $("#builtin-pics .thumbnail:first").addClass("selected");
                    }
                }
            }

        });
        return PlayGround;
    });
})(['backbone', 'underscore', 'handlebars', 'text!templates/uploading-progress.hbs',
        'text!templates/uploading-success.hbs', 'text!templates/uploading-fail.hbs',
        'text!templates/gallery.hbs', 'cookies-js', 'jquery', 'jquery.iframe-transport', 'jquery-file-upload']);

