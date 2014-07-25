define(['spu/views/app-view', 'spu/config'], function (AppView, config) {
    config.init({
        success: function () {
            var appView = new AppView();
            Backbone.history.start();
        }
    });
});
