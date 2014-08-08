define(['spu/datastructures/ocspu'], function (OCSPU) {
    function SPU(data) {
        this.id = data.id;
        this.name = data.name;
        this.ocspuList = data.ocspuList.map(function (ocspu) {
            return new OCSPU(ocspu);
        });
        return this;
    };

    return SPU;
});
