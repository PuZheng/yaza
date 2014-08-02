define(['backbone', 'spu/views/play-ground', 'spu/views/control-panel', 'dispatcher', 'spu/datastructures/spu', 'bootstrap'], function (Backbone, PlayGround, ControlPanel, dispatcher, Spu) {
    var AppView = Backbone.View.extend({
        el: '.primary',

        initialize: function () {
            var spu = this.$('input[name="spu"]').data('val');
            spu = Spu(spu);
            var tagList = this.$('input[name=tag-list]').data('val');
            var orderId = this.$('input[name=order-id]').data('val');;
            this.$mask = this.$('.mask');

            dispatcher.on('aspect-selected', function (aspect) {
                this._playGround.trigger('aspect-selected', aspect);
            }, this)
            .on('aspect-image-setup-done', function (aspect) {
                this._controlPanel.trigger('aspect-image-setup-done', aspect);
            }, this)
            .on('design-region-selected', function (designRegion) {
                this._playGround.trigger('design-region-selected', designRegion);
            }, this)
            .on('design-image-selected', function (arg) {
                this._playGround.trigger('design-image-selected', arg); 
            }, this)
            .on('design-region-setup', function (designRegion) {
                this._controlPanel.trigger('design-region-setup', designRegion);
            }, this)
            .on('object-added', function (image, group) {
                this._controlPanel.trigger('object-added', image, group);
            }, this)
            .on('active-object', function (controlGroup) {
                this._controlPanel.trigger('active-object', controlGroup);
                this._playGround.trigger('active-object', controlGroup);
            }, this)
            .on('mask', function (text) {
                this._playGround.trigger('mask', text);
            }, this)
            .on('unmask', function () {
                this._playGround.trigger('unmask');
            }, this)
            .on('add-text', function (data, text) {
                this._playGround.trigger('add-text', data, text);
            }, this);


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
