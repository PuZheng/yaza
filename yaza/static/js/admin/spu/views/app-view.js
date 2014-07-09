define(['backbone', 'spu/context', 'spu/views/ocspu-view', 'spu/models/spu', 'dispatcher', 'underscore', 'underscore.string'], function (Backbone, context, OcspuView, SPU, dispatcher, _) {
    _.mixin(_.str.exports());

    var AppView = Backbone.View.extend({
        el: '.primary',

        events: {
            'click .btn-new-spu': function () {
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
                    }, {}, this),
                    error: function () {
                        dispatcher.trigger('flash', {
                            type: 'danger',
                            msg: '创建SPU失败!', 
                        });             
                    },
                });
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
                     $(event.target).blur()
                     this._spu.save(['name'], {
                         success: _.bind(function (appView, model, response, options) {
                             dispatcher.trigger('flash', {
                                 type: 'success',
                                 msg: '成功修改SPU名称 - ' + model.get('name') + '!', 
                             });             
                             appView.$('.btn-new-spu').hide();
                             appView.$('.spu-name').text(model.get('name'));
                         }, {}, this),
                         error: function () {
                             dispatcher.trigger('flash', {
                                 type: 'danger',
                                 msg: '修改SPU名称失败!', 
                             });             
                         },
                     });
                 }
            },

            'click .btn-new-ocspu': function () {
                this._ocspuView.$el.insertAfter(this.$('.spu-form'));
                this._ocspuView.$el.fadeIn();
            },

        },

        initialize: function () {
            this._ocspuView = new OcspuView({el: this.$('.ocspu')}).render(); 
            this.$('.btn-new-ocspu').hide();
            dispatcher.on('flash', _.bind(function (appView, arg) {
                var $alert = $(_.sprintf('<div class="alert alert-%s">%s<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button></div>', arg.type, arg.msg)).prependTo(appView.$el);
                setTimeout(function () {
                    $alert.fadeOut();
                }, 2000);
            }, {}, this)); 
        }
    });
    return AppView;
});
