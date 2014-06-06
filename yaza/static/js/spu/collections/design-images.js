define(['backbone', 'models/design-image'], function(Backbone, DesignImage) {

    var DesignImages = Backbone.Collection.extend({

        model: DesignImage,

        constructor: function (tagId, page, pageSize) {
            Backbone.Collection.prototype.constructor.apply(this, arguments);
            this._tagId = tagId;
            this._page = page;
            this._pageSize = pageSize;
        },

        url: function () {
            var ret = '/image/design-images';
            if (this._tagId !== 0) {
                ret += '/' + this._tagId;
            }
            ret += '?page=' + this._page;
            return ret + '&page_size=' + this._pageSize + '&camel_case=1';
        },

        parse: function (resp) {
            this.totalCnt = resp.totalCnt;
            return resp.data;
        }
    });
    
    return DesignImages;
});
