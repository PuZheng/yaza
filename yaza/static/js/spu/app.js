define(['spu/views/app-view', 'spu/config', 'modernizr'], function (AppView, config, Modernizr) {
    Modernizr.addTest('filereader', !!(window.File && window.FileList && window.FileReader));
    if (typeof console === "undefined" || typeof console.log === "undefined") {
        console = {};
        console.log = function() {};
    }
    config.init({
        success: function () {
            appView = new AppView();
            Backbone.history.start();
        }
    });
});
