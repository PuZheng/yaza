define(['backbone'], function (Backbone) {
    var SPU = Backbone.Model.extend({
        url: '/spu-ws/ocspu.json',
        defaults: {
            color: '',
            'cover-path': '',
            rgb: '',
            'spu-id': '',
        },

    });
    return SPU;
});
