define(['backbone'], function (Backbone) {
    var DesignImage = Backbone.Model.extend({
        defaults: {
            id: '',
            thumbnail: '',
            picUrl: '',
            duri: '',
            title: '',
            tags: [],
            backgroundColor: ''
        }
    });
    return DesignImage;
});
