(function (mods) {
    define(mods, function (_, Backbone, dispatcher, Handlebars, jitPreviewTemplate) {
        _.mixin(_.str.exports());
        Handlebars.default.registerHelper("eq", function (target, source, options) {
            if (target === source) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });

        var JitPreview = Backbone.View.extend({
            _template: Handlebars.default.compile(jitPreviewTemplate),

            initialize: function (options) {
                this._spu = options.spu; 
            },
            
            events: {
                'click .ocspu-selector .thumbnail': function (evt) {
                    this.$(".ocspu-selector .thumbnail").removeClass("selected");
                    $(evt.currentTarget).addClass("selected");
                    // show aspects
                    this.$('.aspect-selector').empty();
                    var ocspu = $(evt.currentTarget).data('ocspu');
                    ocspu.aspectList.forEach(function (aspect) {
                        $(this._aspectTpl({aspect: aspect})).appendTo(this.$('.aspect-selector')).data('aspect', aspect);
                    }.bind(this));
                    this.$('.aspect-selector .thumbnail:first-child').click();
                },
                'click .aspect-selector .thumbnail': function (evt) {
                    this.$(".aspect-selector .thumbnail").removeClass("selected");
                    $(evt.currentTarget).addClass("selected");
                    // show hotspot
                    var aspect = $(evt.currentTarget).data('aspect');
                    this.$('.hotspot img').attr('src', aspect.picUrl);
                    
                    aspect.designRegionList.forEach(function (designRegion) {
                        var select = this.$('select[name="current-design-region"]');
                        $(_.sprintf('<option value="%d">%s</option>', designRegion.id, 
                                designRegion.name)).appendTo(select);
                    }.bind(this));
                    $('select[name="current-design-region"]').change(
                            function (designRegionList) {
                                return function (evt) {
                                    for (var i = 0; i < designRegionList.length; ++i) {
                                        var designRegion = designRegionList[i];
                                        if (designRegion.id == $(this).val()) {
                                            dispatcher.trigger('design-region-selected',
                                                designRegion);
                                            break;
                                        }
                                    }
                                }
                            }(aspect.designRegionList)).change();
                },
            },

            render: function () {
                this.$el.append(this._template({spu: this._spu}));
                this._aspectTpl = Handlebars.default.compile(this.$('script.thumbnail').html().trim());
                this.$('.ocspu-selector .thumbnail').each(function (idx, e) {
                    $(e).data('ocspu', this._spu.ocspuList[idx]);
                }.bind(this));
                this.$('.ocspu-selector .thumbnail:first-child').click();
            },
        });
        return JitPreview;
    });
})(['underscore', 'backbone', 'dispatcher', 'handlebars','text!templates/jit-preview.hbs', 'underscore.string']);
