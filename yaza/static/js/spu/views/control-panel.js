define(['jquery', 'backbone', 'underscore', 'handlebars',
'text!templates/control-panel.hbs', 'spu/datastructures/design-region', 
'dispatcher', 'spu/views/select-image-modal', 'spu/views/object-manager',  
'spu/views/add-text-modal', 'spu/views/text-operators',
'underscore.string', 'bootstrap', 'spectrum'], 
function ($, Backbone, _, handlebars, controlPanelTemplate, DesignRegion, 
dispatcher, SelectImageModal, ObjectManager, AddTextModal, TextOperators) {

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
            this._addTextModal = new AddTextModal({el: this.$('.add-text-modal')}).render();
            this._objectManager = new ObjectManager({
                el: this.$('.object-manager')
            }).render();
            this._textOperators = new TextOperators({
                el: this.$('.text-operators'),
            }).render();
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
                // 若仅有一个设计区， 就不要展示设计区选择器了
                if (aspect.designRegionList.length == 1) {
                    $designRegionEl.hide();
                } else {
                    $designRegionEl.show();
                }

                dispatcher.trigger('aspect-selected', aspect);

            },
            'click .design-region-selector a': function (evt) {
                this.$('.design-region-selector a').removeClass('disabled active');
                $(evt.currentTarget).addClass("active disabled");
                var designRegion = $(evt.currentTarget).data('design-region');
                this._currentDesignRegion = designRegion;
                dispatcher.trigger('design-region-selected', designRegion);
            },
            'click .btn-submit': function (e) {
                var $btn = $(e.currentTarget);
                $btn.bootstrapButton('loading');
                dispatcher.trigger('submit-design');
            },
        },


        _setupOcspu: function (ocspu) {
            this.$('.aspect-selector').empty();
            ocspu.aspectList.forEach(function (aspect) {
                $(_.sprintf('<div class="thumbnail"><div><div class="layer"></div><img src="%s" alt="%s" title="%s" data-aspectID="%s"/><div></div>',
                aspect.thumbnail, aspect.name, aspect.name, aspect.id)).appendTo(this.$('.aspect-selector')).data('aspect', aspect);
            }.bind(this));
            // 若仅有一面， 就不要面选择器了
            if (ocspu.aspectList.length == 1) {
                this.$('.aspect-selector').hide(); 
            } else {
                this.$('.aspect-selector').show(); 
            }
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
            })
            .on('design-region-setup', function (designRegion) {
                this._objectManager.empty();
                designRegion.imageLayer().getChildren(function (node) {
                    return node.getClassName() == "Image";
                }).sort(function (a, b) {
                    return a.getZIndex() - b.getZIndex();
                }).forEach(function (node) {
                    this._objectManager.add(node, node.getAttr("control-group"));
                }.bind(this));
                this._textOperators.reset();
            }, this)
            .on('active-object', function (controlGroup) {
                this._objectManager.activeObjectIndicator(controlGroup);
                this._textOperators.reset(controlGroup);
            })
            .on('object-added', function (image, group, oldIm, oldControlGroup) {
                if (!!oldIm && !!oldControlGroup) {
                    this._objectManager.replace(image, group, oldIm, oldControlGroup);
                } else {
                    this._objectManager.add(image, group);
                }
            })
            .on('update-preview-done', function (designRegion, previewLayer) {
                if (!previewLayer) {
                    this._clearThumbnail(this._currentAspect.id, designRegion.id);
                    this.$('.design-region-selector a[design-region="' + designRegion.name + '"] i').remove();
                } else {
                    this._updateThumbnail(this._currentAspect.id,
                        designRegion.id, previewLayer);
                    var dom = this.$('.design-region-selector a[design-region="' + designRegion.name + '"]');
                    if (dom.find("i").size() == 0) {
                        dom.append(_.sprintf("<i class='fa  fa-asterisk fa-fw'></i>"))
                    }
                }
            })
            .on('submit-design-done', function (status) {
                this.$('.btn-submit').bootstrapButton('reset');
            });
        },

        _clearThumbnail: function (aspectId, designRegionId) {
            var $image = this.$('img[data-aspectId=' + aspectId + ']');
            var designRegionName = "design-region-" + designRegionId;
            var stage = $image.data("stage");
            if (!!stage) {
                stage.getChildren(function (node) {
                    return node.getName() == designRegionName;
                }).forEach(function (node) {
                    node.destroy();
                });
            }
        },

        _updateThumbnail: function (aspectId, designRegionId, previewLayer) {
            this._clearThumbnail(aspectId, designRegionId);
            var $image = $('img[data-aspectId=' + aspectId + ']');
            var designRegionName = "design-region-" + designRegionId;
            var stage = $image.data("stage");
            if (!stage) {
                // img has margin-[left|top], however this margin is not 
                // calculate into position().[left|top], so I must recaculate
                // the margin for stage container
                var $container = $image.prev().css({
                    width: $image.width(),
                    height: $image.height(),
                    'margin-left': ($image.parent().width() - $image.width()) / 2,
                    'margin-top': ($image.parent().height() - $image.height()) / 2
                });
                stage = new Kinetic.Stage({
                    container: $container[0],
                    width: $image.width(),
                    height: $image.height()
                });
                $image.data("stage", stage);
            }
            var layer = new Kinetic.Layer({
                name: designRegionName
            });
            stage.add(layer);
            layer.draw();
            var thumbnailContext = layer.getContext();
            thumbnailContext.imageSmoothEnabled = true;
            thumbnailContext.drawImage(previewLayer.getContext().canvas._canvas, previewLayer.x(), previewLayer.y(), previewLayer.width(), previewLayer.height(), 0, 0, $image.width(), $image.height());
        },

    });
    return ControlPanel;
});
