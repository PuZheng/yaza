define(['backbone'], function (Backbone) {
    var SPU = Backbone.Model.extend({
        urlRoot: '/spu-ws/spu.json',
        defaults: {
            name: '',
        },

    });
    return SPU;
});