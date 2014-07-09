define(['backbone', 'handlebars', 'text!templates/admin/spu/aspect.hbs', 
'bootstrap'], function (Backbone, handlebars, aspectTemplate) {
    var AspectView = Backbone.View.extend({

        _template: handlebars.default.compile(aspectTemplate),
        
        events: {
            'click .btn-cancel-aspect': function () {
                this.$el.fadeOut();
            },
        },

        initialize: function () {
            this.$el.html(this._template());
        },
        
        render: function () {
            return this;
        }
    });

    return AspectView;
});
