define(['backbone', 'spu/context', 'spu/views/spu-view', 'spu/views/ocspu-view', 'spu/models/spu', 'dispatcher', 'underscore', 'toastr', 'underscore.string'], function (Backbone, context, SPUView, OcspuView, SPU, dispatcher, _, toastr) {
    _.mixin(_.str.exports());
    toastr.options = {
        "closeButton": false,
        "debug": false,
        "positionClass": "toast-bottom-left",
        "onclick": null,
        "showDuration": "300",
        "hideDuration": "1000",
        "timeOut": "2000",
        "extendedTimeOut": "1000",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
    }
    var AppView = Backbone.View.extend({
        el: '.primary',

        events: {
            'click .btn-new-spu': function (event) {
                var name = this.$('.spu-form input').val().trim();
                if (!name) {
                    this.$('.spu-form input').focus();
                    this.$('.spu-form .text-danger').show();
                    return false; 
                }
                this._spu = new SPU({name: name}); 
                this._spu.save(['name'], {
                    success: _.bind(function (appView, model, response, options) {
                        dispatcher.trigger('flash', {
                            type: 'success',
                            msg: '成功创建SPU - ' + model.get('name') + '!', 
                        });             
                        appView.$('.btn-new-spu').hide();
                        appView.$('.spu-name').text(model.get('name'));
                        appView.$('.btn-new-ocspu').show();
                        context.currentSPU = appView._spu.toJSON();
                        appView.$('.btn-new-spu').removeClass('disabled');
                    }, {}, this),
                    error: (function (appView) {
                        return function () {
                            dispatcher.trigger('flash', {
                                type: 'error',
                                msg: '创建SPU失败!', 
                            });             
                            appView.$('.btn-new-spu').removeClass('disabled');
                        }
                    })(this),
                });
                $(event.target).addClass('disabled');
            },

            'keydown .spu-form input': function () {
                this.$('.spu-form .text-danger').hide();
            },

            'keypress .spu-form input': function (event) {
                 if (event.which != 13) {
                    return true;
                 } 
                 event.preventDefault();
                 if (!!this._spu) {
                     $(event.target).blur();
                     this._spu.set('name', $(event.target).val());
                     this._spu.save(['name'], {
                         success: _.bind(function (appView, model, response, options) {
                             dispatcher.trigger('flash', {
                                 type: 'success',
                                 msg: '成功修改SPU名称 - ' + model.get('name') + '!', 
                             });             
                             appView.$('.spu-name').text(model.get('name'));
                         }, {}, this),
                         error: function () {
                             dispatcher.trigger('flash', {
                                 type: 'error',
                                 msg: '修改SPU名称失败!', 
                             });             
                         },
                     });
                 }
            },

            'click .btn-new-ocspu': function () {
                if (this._ocspuView == undefined) {
                    var $ocspuEl = $('<div class="ocspu"></div>').prependTo(this.$('.panel-spu .list-group'));
                    this._ocspuView = new OcspuView({el: $ocspuEl}).render(); 
                } else if (this._ocspuView.getOCSPU()) {  // 已经生成了OCSPU
                    this._ocspuView.collapse(); 
                    var $ocspuEl = $('<li class="ocspu list-group-item list-group-item-info"></li>').prependTo(this.$('.panel-spu .list-group'));
                    this._ocspuView = new OcspuView({el: $ocspuEl}).render(); 
                }
            },

        },

        initialize: function (option) {
            this.$el.html(new SPUView({
                el: $('.spu'), 
                model: this.model || new SPU(),
            }).render());
            dispatcher.on('flash', function (arg) {
                toastr[arg.type](arg.msg)
            });
        }
    });
    return AppView;
});
