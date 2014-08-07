define(['backbone'], function (Backbone) {
    var Aspect = Backbone.Model.extend({
        urlRoot: '/spu-ws/aspect.json',
        defaults: {
            name: '',
            'pic-path': '',
            'ocspu-id': '',
        },

    });
    return Aspect;
});
