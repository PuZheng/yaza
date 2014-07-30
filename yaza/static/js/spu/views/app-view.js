define(['backbone', 'spu/views/play-ground', 'spu/views/control-panel', 'bootstrap'], function (Backbone, PlayGround, ControlPanel) {
    var AppView = Backbone.View.extend({
        el: '.primary',

        initialize: function () {
            var spu = this.$('input[name="spu"]').data('val');
            var tagList = this.$('input[name=tag-list]').data('val');
            var orderId = this.$('input[name=order-id]').data('val');;
            this._playGround = new PlayGround({
                el: this.$('.play-ground'), 
                spu: spu, 
                tagList: tagList,
            }).render();
            this._controlPanel = new ControlPanel({
                el: this.$('.control-panel'), 
                spu: spu}).render();
        }
    });
    return AppView;
});
