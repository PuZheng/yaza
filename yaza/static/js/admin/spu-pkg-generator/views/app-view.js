define(['backbone', 'spg/views/ocspu-view'], function (Backbone, OcspuView) {
    var AppView = Backbone.View.extend({
        el: '.primary',

        events: {
            'click .btn-new-ocspu': function () {
                this._ocspuView.$el.fadeIn();
            }
        },

        initialize: function () {
            this._ocspuView = new OcspuView({el: this.$('.ocspu')}).render(); 
        }
    });
    return AppView;
});
