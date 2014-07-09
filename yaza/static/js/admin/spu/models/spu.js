define(['backbone'], function (Backbone) {
    var SPU = Backbone.Model.extend({
        url: '/spu-ws/spu.json',
        defaults: {
            name: '',
        },

    });
    return SPU;
});
