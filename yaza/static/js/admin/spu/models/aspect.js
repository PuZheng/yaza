define(['backbone'], function (Backbone) {
    var Aspect = Backbone.Model.extend({
        url: '/spu-ws/aspect.json',
        defaults: {
            name: '',
            'pic-path': '',
            'ocspu-id': '',
        },

    });
    return Aspect;
});
