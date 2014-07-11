define(['backbone'], function (Backbone) {
    var OCSPU = Backbone.Model.extend({
        url: '/spu-ws/ocspu.json',
        defaults: {
            color: '',
            'cover-path': '',
            rgb: '',
            'spu-id': '',
        },

    });
    return OCSPU;
});
