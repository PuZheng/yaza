/**
 * Created by Young on 2014/7/24.
 */
define(['backbone', 'spu/models/config'], function (Backbone, Config) {

    var Fonts = Backbone.Collection.extend({
        model: Config,
        url: '/configs'
    });

    return new Fonts();
});
