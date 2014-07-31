define(['spu/views/app-view', 'spu/config'], function (AppView, config) {
   if (typeof console === "undefined" || typeof console.log === "undefined") {
       console = {};
       console.log = function() {};
   }
   config.init({
       success: function () {
           var appView = new AppView();
           Backbone.history.start();
       }
    });
});
