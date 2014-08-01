define(['backbone', 'underscore', 'handlebars', 'text!templates/control-panel.hbs', 'spu/datastructures/design-region', 'dispatcher', 'spu/views/select-image-modal', 'underscore.string'], function (Backbone, _, handlebars, controlPanelTemplate, DesignRegion, dispatcher, SelectImageModal) {

    _.mixin(_.str.exports());
    
    var ControlPanel = Backbone.View.extend({
        _template: handlebars.default.compile(controlPanelTemplate),

        initialize: function (option) {
            this._spu = option.spu;
            this._tagList = option.tagList;
            console.log(this._tagList);
            this._setupEventsHandler();
        },

        render: function () {
            this.$el.html(this._template({spu: this._spu, tagList: this._tagList}));
            this.$('.ocspu-selector .thumbnail').each(function (idx, e) {
                $(e).data('ocspu', this._spu.ocspuList[idx]);
            }.bind(this));
            this.$('.ocspu-selector .thumbnail:first-child').click();
            this._selectImageModal = new SelectImageModal({el: this.$('.add-img-modal')}).render();
            return this;
        },

        events: {
            'click .ocspu-selector .thumbnail': function (evt) {
                this.$(".ocspu-selector .thumbnail").removeClass("selected");
                $(evt.currentTarget).addClass("selected");
                var ocspu = $(evt.currentTarget).data('ocspu');
                this._setupOcspu(ocspu);
            },
            'click .aspect-selector .thumbnail': function (evt) {
                var aspect = $(evt.currentTarget).data('aspect');
                if (!!this._currentAspect && this._currentAspect.id == aspect.id) {
                    return;
                }
                this.$(".aspect-selector .thumbnail").removeClass("selected");
                $(evt.currentTarget).addClass("selected");
                this._currentAspect = aspect;
                var $designRegionEl = this.$('.design-region-selector .list-group');
                $designRegionEl.empty();
                aspect.designRegionList.forEach(function (designRegion) {
                    designRegion.aspect = aspect;

                    $(_.sprintf("<a href='#' class='list-group-item btn btn-warning' aspect='%s' design-region='%s'>%s</a>", aspect.name, designRegion.name, designRegion.name)
                    ).data('design-region', designRegion).appendTo($designRegionEl);
                });

                dispatcher.trigger('aspect-selected', aspect);

            },
            'click .design-region-selector a': function (evt) {
                this.$('.design-region-selector a').removeClass('disabled active');
                $(evt.currentTarget).addClass("active disabled");
                var designRegion = $(evt.currentTarget).data('design-region');
                dispatcher.trigger('design-region-selected', designRegion);
            }
        },


        _setupOcspu: function (ocspu) {
            this.$('.aspect-selector').empty();
            ocspu.aspectList.forEach(function (aspect) {
                $(_.sprintf('<div class="thumbnail"><div><div class="layer"></div><img src="%s" alt="%s" title="%s" data-aspectID="%s"/><div></div>',
                aspect.thumbnail, aspect.name, aspect.name, aspect.id)).appendTo(this.$('.aspect-selector')).data('aspect', aspect);


            }.bind(this));
            if (!this._currentAspect) {
                this.$('.aspect-selector .thumbnail:first-child').click();
            } else {
                // 切换ocspu的时候，不切换面
                this.$(_.sprintf('.aspect-selector .thumbnail img[title="%s"]', this._currentAspect.name)).parent().click();
            }
        },

        _setupEventsHandler: function () {
            this.on('aspect-image-setup-done', function (aspect) {
                if (this._currentDesignRegion && 
                    this._currentDesignRegion.aspect.name == aspect.name) {
                    var selector = _.sprintf('.design-region-selector a[design-region=%s]', 
                        this._currentDesignRegion.name);
                    this.$(selector).click();
                } else {
                    var selector = _.sprintf('.design-region-selector a[aspect=%s]:first', 
                        aspect.name);
                    this.$(selector).click();
                }
            }); 
        },

        _initSelectImageModal: function () {
            var controlPanel = this;
            this.$('.add-img-modal').on('shown.bs.modal', function (e) {
                if (!controlPanel._designImagesPerPage) {
                    var fakeImage = $('<li><div class="thumbnail"></div></li>');
                    fakeImage = $(fakeImage.appendTo(controlPanel.$('ul.thumbnails'))[0]).hide();
                    var imagesOneRow = Math.floor($(this).find('.thumbnails').width() / fakeImage.width());
                    var imagesOneColumn = Math.ceil($(this).find('.thumbnails').height() / fakeImage.height());
                    fakeImage.remove();
                    controlPanel._designImagesPerPage = imagesOneColumn * imagesOneRow;
                }
                if (!controlPanel.$('.builtin-pics img').length) {
                    controlPanel._selectTag(controlPanel._currentTagId || 0);
                }
                if (!controlPanel.$('.customer-pics img').length) {
                    controlPanel._renderUserPics();
                }

                var templateProgress = handlebars.default.compile(uploadingProgressTemplate);
                var templateSuccess = handlebars.default.compile(uploadingSuccessTemplate);
                var templateFail = handlebars.default.compile(uploadingFailTemplate);
                $(this).find('.upload-img-form').fileupload({
                    dataType: 'json',
                    add: function (e, data) {
                        $('.nav-tabs a:last').tab('show');
                        $(this).find('.uploading-progress').html(
                            templateProgress({
                                fileSize: formatFileSize(data.files[0].size)
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
                            controlPanel._renderUserPics();
                            _selectFirstCustomerImg();
                    },
                    fail: function (e, data) {
                        $(this).find('.uploading-progress').html(templateFail());
                        $(this).find('.uploading-progress').fadeOut(1000);
                    }
                });
            });
        }
    });
    return ControlPanel;
});
