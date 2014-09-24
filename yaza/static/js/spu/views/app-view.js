define(['backbone', 'toastr',
'spu/config', 'spu/views/play-ground', 'spu/views/control-panel', 
'dispatcher', 'spu/datastructures/spu', 'i18next', 'bootstrap'
], 
function (Backbone, toastr, config, PlayGround, ControlPanel, dispatcher, Spu, i18n) {
    toastr.options = {
        "closeButton": false,
        "debug": false,
        "positionClass": "toast-bottom-left",
        "onclick": null,
        "showDuration": "300",
        "hideDuration": "1000",
        "timeOut": "2000",
        "extendedTimeOut": "1000",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
    };

    i18n.init({
        resGetPath: '/static/locales/__lng__/__ns__.json'
    });

    
    var AppView = Backbone.View.extend({
        el: '.primary',
        
        initialize: function () {
            this.$('.mask').hide();
            var spu = this.$('input[name="spu"]').data('val');
            spu = Spu(spu);
            var tagList = this.$('input[name=tag-list]').data('val');
            var orderId = this.$('input[name=order-id]').data('val');
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
            .on('object-added', function (image, group, oldIm, oldGroup) {
                this._controlPanel.trigger('object-added', image, group, oldIm, oldGroup);
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
            }, this)
            .on('text-object-changed', function (type, val) {
                this._playGround.trigger('text-object-changed', type, val);
            }, this)
            .on('update-preview-done', function (designRegion, previewLayer) {
                this._controlPanel.trigger('update-preview-done', designRegion, 
                    previewLayer);
            }, this)
            .on('update-preview', function () {
                this._playGround.trigger('update-preview');
            }, this)
            .on('submit-design', function () {
                this._playGround.trigger('submit-design');
            }, this)
            .on('flash', function (type, msg) {
                toastr[type](msg);
            }, this)
            .on('submit-design-done', function (status) {
                this._controlPanel.trigger('submit-design-done', status);
            }, this);


            this._playGround = new PlayGround({
                el: this.$('.play-ground'), 
                spu: spu, 
                orderId: orderId,
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
