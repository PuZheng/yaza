define(['backbone', 'spu/models/tag'], function (Backbone, Tag) {
    
    var Tags = Backbone.Collection.extend({
        model: Tag,
        url: '/image/tag-list',
    });

    return new Tags();
});
