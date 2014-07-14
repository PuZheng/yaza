define(['backbone'], function (Backbone) {
    var DesignRegion = Backbone.Model.extend({
        url: '/spu-ws/design-region.json',
        defaults: {
            name: '',
            width: '',
            height: '',
            'pic-path': '',
            'aspect-id': '',
        },

    });
    return DesignRegion;
});
