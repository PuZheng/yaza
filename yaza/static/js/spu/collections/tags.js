define(['backbone', 'models/tag'], function (Backbone, Tag) {
    
    var Tags = Backbone.Collection.extend({
        model: Agent,
        url: '/image/tag-list',
    });

    return new Tags();
});
