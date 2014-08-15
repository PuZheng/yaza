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
        // 当不支持cors时， 直接取data uri
        var useDataUri = !$.support.cors;
        $.ajax({url: useDataUri? this.duriUrl: this.picUrl, crossDomain: true}).done(function (data) {
            if (useDataUri) {
                this.picUrl = data;
            }
            d.resolve(this);
        }.bind(this));
        return d;
    }

    return Aspect;
});
