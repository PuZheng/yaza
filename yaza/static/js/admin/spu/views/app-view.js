define(['backbone', 'spu/context', 'spu/views/spu-view', 'spu/models/spu', 'dispatcher', 'underscore', 'toastr', 'underscore.string', 'bootstrap'], function (Backbone, context, SPUView, SPU, dispatcher, _, toastr) {
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
            new SPUView({
                el: $('.spu'), 
                model: this.model || new SPU(),
            }).render();
            dispatcher.on('flash', function (arg) {
                toastr[arg.type](arg.msg)
            });
        }
    });
    return AppView;
});
