(function (mods) {
    define(mods, function (Backbone, PlayGround, JitPreview) {

        var AppView = Backbone.View.extend({
            el: '.primary',

            initialize: function () {
                spu = this.$('input[name="spu"]').data('val');
                this._playGround = new PlayGround({el: this.$('.play-ground'), spu: spu}).render();
                $("[name=image-picker-select]").select2().imagepicker({show_label: true, hide_select: false}).on("change", this._displayImgs);
                $('.nav-tabs a:first').tab('show');
                $(document).ready(this._displayImgs);
                this._jitPreview = new JitPreview({el: this.$('.jit-preview'), spu: spu}).render();
            },

            _displayImgs:function () {
                    $("#selected-imgs").empty();
                    var selected = $("[name=image-picker-select]").find("option:selected").each(function () {
                        var div = $("<div></div>").addClass("col-xs-6 col-md-3").html(
                            $("<a></a>").addClass("thumbnail").html(
                                $("<img></img>").attr("src", $(this).attr("data-img-src"))));
                        $("#selected-imgs").append(div);
                    });

                },
        });
        return AppView;
    })
})(['backbone', 'views/play-ground', 'views/jit-preview',
    'bootstrap', 'select2', 'image-picker']);
