define(['backbone'], function (Backbone) {
    
    var Tag = Backbone.Model.extend({
        defaults: {
            id: '',
            tag: ''
        } 
    });

    return Tag;
});
