(function (mods) {
    define(mods, function (Backbone, PlayGround) {
        
        var AppView = Backbone.View.extend({
            el: '.primary',

            initialize: function () {
                this._playGround = new PlayGround({el: this.$('.playground')}).render(); 
            }
        });
        return AppView;
    })
})(['backbone', 'views/play-ground', 'bootstrap']);
