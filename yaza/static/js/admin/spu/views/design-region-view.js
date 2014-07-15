define(['spu/views/base-view'], 
    function (BaseView) {
        var DesignRegionView = BaseView.extend({
            label: '定制区',
            fields: [
            {
                name: 'name',
                type: 'text',
                label: '名称',
                error: '例如前胸...',
                placeholder: '正面或者反面等...',
            }, 
            {
                name: 'width',
                type: 'number',
                label: '宽度(英寸)',
                error: '宽度不能为空',
            },
            {
                name: 'height',
                type: 'number',
                label: '高度(英寸)',
                error: '高度不能为空',
            },
            {
                name: 'pic-path',
                type: 'file',
                label: '图片',
            },
            ],
            title: 'name',
        });
        return DesignRegionView;
    });
