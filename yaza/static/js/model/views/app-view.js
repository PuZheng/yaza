(function (mods) {
    define(mods, function (Backbone, PlayGround) {

        var AppView = Backbone.View.extend({
            el: '.primary',

            initialize: function () {
                this._playGround = new PlayGround({el: this.$('.play-ground')}).render();
                $("[name=image-picker-select]").select2().imagepicker({show_label: true, hide_select: false}).on("change", this._displayImgs);
                $('.nav-tabs a:first').tab('show');
                $(document).ready(this._displayImgs);
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
})(['backbone', 'views/play-ground', 'bootstrap', 'select2', 'image-picker']);
