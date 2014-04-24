(function (mods) {
    define(mods, function (Backbone, dispatcher) {
        var JitPreview = Backbone.View.extend({
            initialize: function (options) {
                this._spu = options.spu; 
            },
            render: function () {
                // TODO load images
                dispatcher.trigger('design-region-selected', this._spu.ocspuList[0].aspectList[0].designRegionList[0]); 
            },
        });
        return JitPreview;
    });
})(['backbone', 'dispatcher']);
