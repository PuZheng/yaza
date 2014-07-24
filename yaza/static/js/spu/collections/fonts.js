/**
 * Created by Young on 2014/7/24.
 */
define(['backbone', 'spu/models/font'], function (Backbone, Font) {

    var Fonts = Backbone.Collection.extend({
        model: Font,
        url: '/fonts',
    });

    return new Fonts();
});
