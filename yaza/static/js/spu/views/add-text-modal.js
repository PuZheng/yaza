define(['backbone', 'spu/config', 'dispatcher'],
    function (Backbone, config, dispatcher) {

        var AddTextModal = Backbone.View.extend({
            events: {
                'click .btn-ok': function (evt) {
                    var text = this.$('input:text').val().trim();
                    if (!text) {
                        alert('文字不能为空');
                        return;
                    }
                    this.$el.modal('hide');
                    this.$('input').val('');
                    $.ajax({
                        type: 'POST',
                        url: '/image/font-image',
                        data: {
                            text: text,
                            'font-family': config.DEFAULT_FONT_FAMILY,
                            // 注意, 这里已经是生产大小了
                            'font-size': parseInt(config.DEFAULT_FONT_SIZE * config.PPI / 72),
                            'font-color': config.DEFAULT_FONT_COLOR
                        },
                        beforeSend: function () {
                            dispatcher.trigger("mask");
                        }
                    }).done(function (data) {
                        dispatcher.trigger('add-text', data, text);
                    }).always(function () {
                        dispatcher.trigger("unmask");
                    });
                },
                'keypress input:text': function (e) {
                    if (e.key == "Enter") {
                        this.$(".btn-ok").click();
                    }
                }
            },

            render: function () {
                return this;
            }
        });
        return AddTextModal;
    });
