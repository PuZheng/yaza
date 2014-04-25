(function (mods) {
    define(mods, function (Backbone, dispatcher, handlebars, jitPreviewTemplate) {
        var JitPreview = Backbone.View.extend({
            _template: handlebars.default.compile(jitPreviewTemplate),

            initialize: function (options) {
                this._spu = options.spu; 
            },
            render: function () {
                // TODO load images
                this.$el.append(this._template());
                dispatcher.trigger('design-region-selected', this._spu.ocspuList[0].aspectList[0].designRegionList[0]);
            },
        });
        return JitPreview;
    });
})(['backbone', 'dispatcher', 'handlebars','text!templates/jit-preview.hbs']);
