define(['backbone', 'spectrum', 'spg/views/aspect-view', 'handlebars', 'text!templates/admin/spu-pkg-generator/ocspu.hbs'], function (Backbone, spectrum, AspectView, handlebars, ocspuTemplate) {
    var OcspuView = Backbone.View.extend({

        _template: handlebars.default.compile(ocspuTemplate),

        events: {
            'click .btn-cancel-ocspu': function() {
                this.$el.fadeOut();
            }, 

            'click .btn-new-aspect': function () {
                this._aspectView.$el.fadeIn();
            }
        },

        initialize: function () {
            this.$el.html(this._template());
            this._aspectView = new AspectView({el: this.$('.aspect')}).render();
            this.$('.aspect').hide();
        },

        render: function () {
            this.$('input.color').spectrum({
                showPalette: true,
                preferredFormat: "name",
                chooseText: "确定",
                cancelText: "取消",
                showInput: true,
                showAlpha: true,
            });
            return this;
        },

    });
    return OcspuView;
});
