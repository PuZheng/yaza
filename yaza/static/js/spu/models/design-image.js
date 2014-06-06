define(['backbone'], function (Backbone) {
    var DesignImage = Backbone.Model.extend({
        defaults: {
            id: '',
            thumbnail: '',
            picUrl: '',
            title: '',
            tags: []
        }
    });
    return DesignImage;
});
