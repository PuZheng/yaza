define(['spu/views/base-view',
        'spu/views/ocspu-view',
        'spu/models/ocspu'],
    function (BaseView, OCSPUView, OCSPU) {
        var SPUView = BaseView.extend({
            //注意 events不能写在BaseView, 否则每层都会触发
            events: {
                'click a.fancybox': function (event) {
                    event.preventDefault();
                    $(event.currentTarget).ekkoLightbox();
                }
            },
            label: 'SPU',
            fields: [
                {
                    name: 'name',
                    type: 'text',
                    label: '名称',
                    error: '名称不能为空',
                    placeholder: 'SPU名称',
                    class: 'col-md-4',
                }
            ],
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
