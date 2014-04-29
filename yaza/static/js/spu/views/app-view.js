define(['backbone', 'views/play-ground', 'views/jit-preview', 'bootstrap', 'select2'], function (Backbone, PlayGround, JitPreview) {
    var AppView = Backbone.View.extend({
        el: '.primary',

        initialize: function () {
            var spu = this.$('input[name="spu"]').data('val');
            var design_image_list = this.$('input[name=design-image-list]').data('val');
            this._playGround = new PlayGround({el: this.$('.play-ground'), spu: spu, design_image_list: design_image_list}).render();
            this._jitPreview = new JitPreview({el: this.$('.jit-preview'), spu: spu}).render();

        }
    });
    return AppView;
});
