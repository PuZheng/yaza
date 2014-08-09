define(['backbone', 'admin/spu/context', 'admin/spu/views/spu-view', 'admin/spu/models/spu', 'dispatcher', 'underscore', 'toastr', 'underscore.string', 'bootstrap'], function (Backbone, context, SPUView, SPU, dispatcher, _, toastr) {
    _.mixin(_.str.exports());
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
    }
    var AppView = Backbone.View.extend({
        el: '.primary',

        initialize: function (option) {
            this.$mask = $('.mask');
            var spuView = new SPUView({
                el: $('.spu'), 
                model: this.model || new SPU(),
            });
            spuView.on('loaded', function () {
                this.validate();
            });
            spuView.render();
            dispatcher.on('flash', function (arg) {
                toastr[arg.type](arg.msg)
            }).on('mask', function (appView) {
                return function (msg) {
                    appView.$mask.show().find('.text-info').text(msg);
                }
            }(this)).on('unmask', function (appView) {
                return function () {
                    appView.$mask.hide();
                }
            }(this)).on('validate', function () {
                spuView.validate();
            });
        }
    });
    return AppView;
});
