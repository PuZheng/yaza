define(['backbone', 'views/play-ground', 'views/jit-preview', 'bootstrap', 'select2'], function (Backbone, PlayGround, JitPreview) {
    var AppView = Backbone.View.extend({
        el: '.primary',

        initialize: function () {
            var spu = this.$('input[name="spu"]').data('val');
            var tagList = this.$('input[name=tag-list]').data('val');
            this._playGround = new PlayGround({
                el: this.$('.play-ground'), 
                spu: spu, 
                tagList: tagList,
            }).render();
            this._jitPreview = new JitPreview({el: this.$('.jit-preview'), spu: spu}).render();
        }
    });
    return AppView;
});
