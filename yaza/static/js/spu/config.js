define(['spu/models/config'], function (config) {

    function Config() {
        return this;  
    };

    Config.prototype = {
        init: function (arg) {
            var that = this;
            config.fetch({
                success: function (model, response, options) {
                    _.extend(that, model.toJSON());
                    arg.success(model, response, options);
                }
            });
        },
    }
    return new Config();
});
