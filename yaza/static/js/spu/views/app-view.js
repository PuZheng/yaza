define(['backbone', 'spu/views/play-ground', 'spu/views/control-panel', 'dispatcher', 'spu/datastructures/spu', 'bootstrap'], function (Backbone, PlayGround, ControlPanel, dispatcher, Spu) {
    var AppView = Backbone.View.extend({
        el: '.primary',

        initialize: function () {
            var spu = this.$('input[name="spu"]').data('val');
            spu = Spu(spu);
            var tagList = this.$('input[name=tag-list]').data('val');
            var orderId = this.$('input[name=order-id]').data('val');;

            dispatcher.on('aspect-selected', function (aspect) {
                this._playGround.trigger('aspect-selected', aspect);
            }.bind(this))
            .on('aspect-image-setup-done', function (aspect) {
                this._controlPanel.trigger('aspect-image-setup-done', aspect);
            }.bind(this))
            .on('design-region-selected', function (designRegion) {
                this._playGround.trigger('design-region-selected', designRegion);
            }.bind(this));
            .on('design-image-selected', function (arg) {
                this._playGround.trigger('design-image-selected', arg); 
            }.bind(this));

            this._playGround = new PlayGround({
                el: this.$('.play-ground'), 
                spu: spu, 
            }).render();
            this._controlPanel = new ControlPanel({
                el: this.$('.control-panel'), 
                spu: spu,
                tagList: tagList,
            }).render();
        }
    });
    return AppView;
});
