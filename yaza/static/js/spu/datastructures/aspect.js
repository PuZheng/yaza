define(['jquery', 'spu/datastructures/design-region', 'getImageData'], function ($, DesignRegion) {
    function Aspect(data) {
        this.id = data.id;
        this.picUrl = data.picUrl;
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
        var crossDomain = this.picUrl.indexOf("http") == 0;
        if ($.support.cors || !crossDomain) {
            $.ajax({url: this.picUrl, crossDomain: true}).done(function () {
                d.resolve(this);
            }.bind(this));
        } else {
            $.getImageData({
                url: this.picUrl,
                crossDomain: true,
                success: function (image) {
                    d.resolve(this);
                }.bind(this),
            });
        }
        return d;
    }

    return Aspect;
});
