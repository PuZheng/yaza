define(['backbone', 'jquery', 'jquery.browser'], function (Backbone, $) {
    var DesignImage = Backbone.Model.extend({
        defaults: {
            id: '',
            thumbnail: '',
            picUrl: '',
            duri: '',
            title: '',
            tags: [],
            backgroundColor: ''
        },

        parse: function (response, options) {
            if ($.browser.msie && $.browser.version != '11') {
                response.picUrl = response.duri;
            }
            return response;
        } 
    });
    return DesignImage;
});
