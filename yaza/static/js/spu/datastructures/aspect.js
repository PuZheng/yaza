define(['jquery', 'spu/datastructures/design-region', 'utils/load-image'], function ($, DesignRegion, loadImage) {
    function Aspect(data) {
        this.id = data.id;
        this.picUrl = data.picUrl;
        this.duriUrl = data.duriUrl;
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
        console.log('get aspect image: ' + this.duriUrl);
        var d = $.Deferred();
        $.ajax({url: this.duriUrl, crossDomain: true}).done(function (data) {
            this.dataUri = data;
            d.resolve(this);
        }.bind(this));
        return d;
    }

    return Aspect;
});
