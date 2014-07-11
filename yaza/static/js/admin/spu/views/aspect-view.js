define(['backbone', 'handlebars', 'text!templates/admin/spu/aspect.hbs', 
'bootstrap'], function (Backbone, handlebars, aspectTemplate) {
    var AspectView = Backbone.View.extend({

        _template: handlebars.default.compile(aspectTemplate),
        
        events: {
            'click .btn-cancel-aspect': function () {
                this.$el.fadeOut();
            },
            'click .btn-ok': function () {
                var aspectName = this.$aspectNameInput.val();
                if (!aspectName) {
                    this.$aspectNameInput.data('error-label').show();
                    return false;
                }
                var files = this.$imageInput[0].files;
                var image = !!files.length && files[0];
                if (!image) {
                    this.$imageInput.data('error-label').show();
                    return false;
                }
                var data = this.$imageInput.data('data');
                data.submit();
            }
        },

        initialize: function () {
            this.$el.html(this._template());
            this.$aspectNameInput = this.$('.aspect-form .form-group:first-child input');
            this.$aspectNameInput.data('error-label', this.$aspectNameInput.parent().next('.text-danger'));
            this.$imageInput = this.$('.aspect-form .form-group:last-child :file');
            this.$imageInput.data('error-label', this.$('.aspect-form .form-group:last-child .text-danger'));
        },
        
        render: function () {
            return this;
        }
    });

    return AspectView;
});
