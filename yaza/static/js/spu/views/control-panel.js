define(['backbone', 'underscore', 'handlebars', 'text!templates/control-panel.hbs', 'spu/datastructures/design-region', 'dispatcher', 'underscore.string'], function (Backbone, _, handlebars, controlPanelTemplate, DesignRegion, dispatcher) {

    _.mixin(_.str.exports());
    
    var ControlPanel = Backbone.View.extend({
        _template: handlebars.default.compile(controlPanelTemplate),

        initialize: function (option) {
            this._spu = option.spu;
            this._setupEventsHandler();
        },

        render: function () {
            this.$el.html(this._template({spu: this._spu}));
            this.$('.ocspu-selector .thumbnail').each(function (idx, e) {
                $(e).data('ocspu', this._spu.ocspuList[idx]);
            }.bind(this));
            this.$('.ocspu-selector .thumbnail:first-child').click();
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
        }
    });
    return ControlPanel;
});
