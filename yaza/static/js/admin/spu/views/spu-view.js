define(['spu/views/base-view', 'spu/models/spu'], function (BaseView, SPU) {
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
    });
    return SPUView;
});
