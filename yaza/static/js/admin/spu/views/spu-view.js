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
            },

            render: function (collapsed) {
                var ret = BaseView.prototype.render.call(this, collapsed);
                var s = '<button class="btn btn-primary btn-publish">' + '<i class="fa fa-eye"></i><span></span>' + '</button>';
                var $panelFooter = this.$('.panel-' + this.label + ' > .panel-footer');
                this.$publishBtn = $(s).appendTo($panelFooter.find('.pull-right')).click(function (e) {
                
                });
                if (this.model.id == undefined) {
                    this.$publishBtn.hide();
                    this.on('object-created', function () {
                            this.$publishBtn.find('span').text('发布');
                            this.$publishBtn.show();
                            });
                } else {
                    if (this.model.published) {
                        this.$publishBtn.find('span').text('取消发布');
                        this.$publishBtn.find('i').removeClass('fa-eye').addClass('fa-eye-slash');
                        this.disable();
                        this.$publishBtn.off('click').click(function () {
                            this.enable(); 
                        });
                    } else {
                        this.$publishBtn.find('span').text('发布');
                        this.$publishBtn.find('i').addClass('fa-eye').removeClass('fa-eye-slash');
                        this.$publishBtn.off('click').click(function () {
                            this.disable(); 
                        });
                    }
                }
                return ret;
            }
        });
        return SPUView;
    });
