define(['backbone', 'handlebars',
'text!templates/text-operators.hbs', 'spu/config', 'spu/colors', 'dispatcher',
'spectrum',
], 
function (Backbone, handlebars, template, config, make2DColorArray, dispatcher) {
    var TextOperators = Backbone.View.extend({

        _template: handlebars.default.compile(template),

        events: {
            'click .btn-change-text': function () {
                this._controlGroup.fire('dblclick');
                return false;
            },
            'change select.font-size': function (evt) {
                dispatcher.trigger('text-object-changed', 'font-size', 
                    $(evt.currentTarget).val());
                return false;
            },
            'change select.font-family': function (evt) {
                dispatcher.trigger('text-object-changed', 'font-family', 
                    $(evt.currentTarget).val());
                return false;
            },        
        },

        render: function () {
            this.$el.html(this._template());
            this.$('.text-color').spectrum({
                showPalette: true,
                preferredFormat: "name",
                chooseText: "确定",
                cancelText: "取消",
                showInput: true,
                showAlpha: true,
                palette: make2DColorArray(10),
                change: function (color) {
                    dispatcher.trigger('text-object-changed', 'color', color); 
                }, 
            });
            this.$('select.font-size').html(
                config.FONT_SIZE_LIST.map(
                    function (fontSize) {
                        return _.sprintf('<option value="%s">%s pt</option>', fontSize, fontSize);
                    }).join(''));
            this.$('select.font-family').html(
                config.FONT_FAMILY_LIST.map(
                    function (fontFamily) {
                        return _.sprintf('<option value="%s">%s</option>', fontFamily, fontFamily);
                    }).join(''));            
            return this; 
        },

        reset: function (controlGroup) {
            if (!!controlGroup && controlGroup.getAttr('object-type') == 'text') {
                this.$el.show();
                this.$('.text-color').spectrum('set',
                        controlGroup.getAttr('text-color') || config.DEFAULT_FONT_COLOR);
                this.$('select.font-size').val(controlGroup.getAttr('font-size') || config.DEFAULT_FONT_SIZE);
                this.$('select.font-family').val(controlGroup.getAttr('font-family') || config.DEFAULT_FONT_FAMILY);
                this._controlGroup = controlGroup;
            } else {
                this.$el.hide();
            }
        },
    });

    return TextOperators;
});
