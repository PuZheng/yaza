define(['backbone'], function (Backbone) {
    var OCSPU = Backbone.Model.extend({
        urlRoot: '/spu-ws/ocspu.json',
        defaults: {
            color: '',
            'cover-path': '',
            rgb: '',
            'spu-id': '',
        },

    });
    return OCSPU;
});
