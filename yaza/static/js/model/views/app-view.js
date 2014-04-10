(function (mods) {
    define(mods, function (Backbone) {
        
        var AppView = Backbone.View.extend({
            el: '.primary',

            initialize: function () {
            }
        });
        return AppView;
    })
})(['backbone']);
