define(['spu/views/base-view',
        'spu/views/aspect-view',
        'spu/models/aspect'],
    function (BaseView, AspectView, Aspect) {
        var OCSPUView = BaseView.extend({
            label: 'OCSPU',
            fields: [
                {
                    name: 'color',
                    type: 'text',
                    label: '底色名称',
                    error: '底色名称不能为空',
                    placeholder: '例如棕红色, 银灰色...',
                },
                {
                    name: 'rgb',
                    type: 'color',
                    label: '底色RGB',
                    error: '底色不能为空',
                },
                {
                    name: 'cover-path',
                    type: 'file',
                    label: '材质图',
                    error: '材质图不能为空',
                }
            ],
            title: 'color',
            nextLevel: {
                objects: function (model) {
                    return model.get('aspect-id-list').map(function (aspectId) {
                        return new Aspect({
                            id: aspectId,
                        });
                    });
                },
                view: AspectView,
                newObject: function () {
                    return new Aspect();
                },
                parentRefBack: 'ocspu-id',
            }
        });
        return OCSPUView;
    });
