define(['backbone', 'handlebars', 'text!templates/play-ground.hbs'], function (Backbone, handlebars, playGroundTemplate) {

    var PlayGround = Backbone.View.extend({
        _template: handlebars.default.compile(playGroundTemplate),

        initialize: function (option) {
            this._spu = option.spu;
        },

        render: function () {
            this.$el.html(this._template());
            return this;
        }
    });

    return PlayGround;
});
