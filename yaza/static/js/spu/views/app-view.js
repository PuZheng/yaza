(function (mods) {
    define(mods, function (Backbone, PlayGround, JitPreview) {
        function select(item) {
            $(".thumbnails .thumbnail").removeClass("selected");
            $(item).addClass("selected");
        }

        var AppView = Backbone.View.extend({
            el: '.primary',

            initialize: function () {
                spu = this.$('input[name="spu"]').data('val');
                this._playGround = new PlayGround({el: this.$('.play-ground'), spu: spu}).render();
                $('.nav-tabs a:first').tab('show');
                $(document).ready(this._displayImgs);
                this._jitPreview = new JitPreview({el: this.$('.jit-preview'), spu: spu}).render();
                $('.nav-tabs a:first').tab('show');

                $(document).on("click", ".thumbnails .thumbnail",function () {
                    select(this);
                }).on("dblclick", function () {
                    select(this);
                    $('.add-img-modal').modal('hide');
                });
            }

        });
        return AppView;
    })
})(['backbone', 'views/play-ground', 'views/jit-preview',
    'bootstrap', 'select2']);
