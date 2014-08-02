define(['spu/datastructures/aspect'], function (Aspect) {
    function OCSPU(data) {
        this.id = data.id;
        this.aspectList = data.aspectList.map(function (aspect) {
            var ret = new Aspect(aspect); 
            ret.ocspu = this;
            return ret;
        }.bind(this));
        this.cover = data.cover;
        this.color = data.color;
        this.rgb = data.rgb;
        this.complementaryColor = data.complementaryColor;
        this.hoveredComplementaryColor = data.hoveredComplementaryColor;
        this.marginColor = data.marginColor;
        this.paddingColor = data.paddingColor;
        return this; 
    }  
    return OCSPU;
});
