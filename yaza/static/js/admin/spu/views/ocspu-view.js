define(['dispatcher', 'spu/context', 'backbone', 'spectrum', 'spu/views/aspect-view', 'handlebars', 'text!templates/admin/spu/ocspu.hbs', 'fancybox', 'jquery-file-upload'], function (dispatcher, context, Backbone, spectrum, AspectView, handlebars, ocspuTemplate) {
    var OcspuView = Backbone.View.extend({
        el: 'div',

        _template: handlebars.default.compile(ocspuTemplate),

        events: {
            'click .btn-cancel-ocspu': function() {
                this.$el.fadeOut();
            }, 

            'click .panel-new-ocspu > .panel-footer .btn-ok': function () {
                var colorName = this.$colorNameInput.val();
                var files = this.$materialImageInput[0].files;
                var materialImage = !!files.length && files[0];
                if (!colorName) {
                    this.$colorNameInput.focus().parent().next('.text-danger').show();
                    return false;
                }
                if (!materialImage) {
                    this.$('.ocspu-form > .form-group:nth-child(3) label.text-danger').show();
                    return false;
                }
                this.$('.ocspu-form').fileupload('send', {
                    files: files,
                    formData: {
                        'color': colorName,
                        'rgb': this.$rgbInput.val(),
                        'spu-id': context.currentSPU.id,
                    }
                });
            },

            'click .btn-new-aspect': function () {
                this._aspectView.$el.fadeIn();
            }
        },

        initialize: function () {
            this.$el.html(this._template());
            this._aspectView = new AspectView({el: this.$('.aspect')}).render();
            this.$colorNameInput = this.$('.ocspu-form .form-group:first-child input');
            this.$rgbInput = this.$('.ocspu-form input[type=color]');
            this.$materialImageInput = this.$('.ocspu-form :file'); 
            this.$colorNameInput.keydown(function (event) {
                $(this).parent().next('.text-danger').hide();
            });
            this.$colorNameInput.keydown(function (event) {
                $(this).parent().next('.text-danger').hide();
            });
            this.$('.aspect').hide();
            this.$('.fancybox').fancybox();
            // 因为文件的原因， 只能手动写ajax
            this.$('.ocspu-form').fileupload({
                dataType: 'json',
                //formData: {
                    //'color-name': colorName,
                    //'rgb': this.$rgbInput.val(),
                //},
                add: (function (ocspuView) {
                    return function (e, data) {
                        ocspuView.$('.ocspu-form :file').next('.text-danger').hide();
                        var fileReader = new FileReader();
                        fileReader.onload = (function (a) {
                            return function (e) {
                                a.href = e.target.result;
                                $(a).find('img')[0].src = e.target.result;
                                if (!!this._ocspu) {
                                    // TODO update the ocspu
                                }
                            };
                        })(ocspuView.$('a.fancybox')[0]);
                        fileReader.readAsDataURL(data.files[0]);
                        // 只有修改ocspu的材质图的时候， 才直接提交数据
                        //if (!!ocspuView._ocspu) {
                            //$(this).find('.uploading-progress').show();
                            //var reader = new FileReader();
                            //// Automatically upload the file once it is added to the queue
                            //var jqXHR = data.submit();
                            //$(this).find('.uploading-progress .upload-cancel-btn').click(
                                //function () {
                                    //jqXHR.abort();
                                    //$(this).find('.uploading-progress').fadeOut(1000);
                                //});
                        //}
                    }
                })(this),
                progress: function (e, data) {
                    // Calculate the completion percentage of the upload
                    var progress = parseInt(data.loaded / data.total * 100, 10);
                    // Update the hidden input field and trigger a change
                    // so that the jQuery knob plugin knows to update the dial
                    $(this).find('.uploading-progress .progress-bar').text(progress + '%').css('width', progress + '%').attr('aria-valuenow', progress);
                },
                done: function (e, data) {
                    $(this).find('.uploading-progress').fadeOut(1000);
                    dispatcher.trigger('flash', {
                        type: 'success',
                        msg: '成功创建OCSPU - ' + colorName,
                    });
                    // TODO 
                },
                fail: function (e, data) {
                    $(this).find('.uploading-progress').fadeOut(1000);
                    dispatcher.trigger('flash', {
                        type: 'error',
                        msg: '创建OCSPU失败',
                    });
                }
            });
        },

        render: function () {
            return this;
        },

    });
    return OcspuView;
});
