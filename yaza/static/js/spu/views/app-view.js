(function (mods) {
    define(mods, function (Backbone, PlayGround) {
        function select(item) {
            $(".thumbnails .thumbnail").removeClass("selected");
            $(item).addClass("selected");
        }

        var AppView = Backbone.View.extend({
            el: '.primary',

            initialize: function () {
                this._playGround = new PlayGround({el: this.$('.play-ground')}).render();
                $('.nav-tabs a:first').tab('show');

                $(".thumbnails .thumbnail").on("click",function () {
                    select(this);
                }).on("dblclick", function () {
                    select(this);
                    $('.add-img-modal').modal('hide');
                });
            }

        });
        return AppView;
    })
})(['backbone', 'views/play-ground', 'bootstrap', 'select2']);
