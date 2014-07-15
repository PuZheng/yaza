define(['spu/views/base-view', 
    'spu/views/ocspu-view', 
    'spu/models/ocspu'], 
    function (BaseView, OCSPUView, OCSPU) {
        var SPUView = BaseView.extend({
            label: 'SPU',
            fields: [{
                name: 'name',
                type: 'text',
                label: '名称',
                error: '名称不能为空',
                placeholder: 'SPU名称',
            }],
            title: 'name',
            nextLevel: {
                objects: function (model) {
                    return model.get('ocspu-id-list').map(function (ocspuId) {
                        return new OCSPU({id: ocspuId});
                    });
                },
                view: OCSPUView,
                newObject: function () {
                    return new OCSPU();
                },
                parentRefBack: 'spu-id',
            }
        });
        return SPUView;
    });
