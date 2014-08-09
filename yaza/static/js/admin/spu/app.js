define(['admin/spu/views/app-view', 'admin/spu/models/spu', 'jquery', 'js-url'], function (AppView, SPU, $) {
    var spuId = $.url('filename');
    if (spuId === 'spu') {
        var appView = new AppView();
    } else {
        var spu = new SPU({
            id: spuId,
        });
        spu.fetch({
            success: function () {
                var appView = new AppView({model: spu});
            }
        });
    }
    Backbone.history.start();
});
