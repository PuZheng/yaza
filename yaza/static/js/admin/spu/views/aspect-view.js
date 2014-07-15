define(['spu/views/base-view', 
    'spu/views/design-region-view', 
    'spu/models/design-region'], 
    function (BaseView, DesignRegionView, DesignRegion) {
        var AspectView = BaseView.extend({
            label: '面',
            fields: [
            {
                name: 'name',
                type: 'text',
                label: '名称',
                error: '名称不能为空',
                placeholder: '正面或者反面等...',
            }, 
            {
                name: 'pic-path',
                type: 'file',
                label: '面图片',
                error: '图不能为空',
            }
            ],
            title: 'name',
            nextLevel: {
                objects: function (model) {
                    return model.get('design-region-id-list').map(function (designRegionId) {
                        return new DesignRegion({
                            id: designRegionId,
                        });
                    });
                },
                view: DesignRegionView,
                newObject: function () {
                    return new DesignRegion();
                },
                parentRefBack: 'aspect-id',
            }
        });
        return AspectView;
    });
