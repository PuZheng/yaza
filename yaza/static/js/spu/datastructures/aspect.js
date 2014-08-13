define(['jquery', 'spu/datastructures/design-region', 'utils/load-image'], function ($, DesignRegion, loadImage) {
    function Aspect(data) {
        this.id = data.id;
        this.picUrl = $.support.cors? data.picUrl: data.localPicUrl;
        this.hdPicUrl = data.hdPicUrl;
        this.thumbnail = data.thumbnail;
        this.designRegionList = data.designRegionList.map(function (dr) {
            return new DesignRegion(dr);
        });
        this.name = data.name;
        this.size = data.size;
        return this;
    }

    Aspect.prototype.getImage = function () {
        console.log('get aspect image: ' + this.picUrl);
        var d = $.Deferred();
        loadImage(this.picUrl).done(function (image) {
            d.resolve(this); 
        }.bind(this));
        return d;
    }

    return Aspect;
});
