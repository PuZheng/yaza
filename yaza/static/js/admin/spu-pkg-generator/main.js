require.config({
    baseUrl: '/static',
    paths: {
        // vendors using bootcss cdn
        jquery: ['http://cdn.bootcss.com/jquery/2.1.1/jquery.min', 'components/jquery/dist/jquery.min'],
        underscore: ['http://cdn.bootcss.com/underscore.js/1.6.0/underscore-min', 'components/underscore/underscore'],
        backbone: ['http://cdn.bootcss.com/backbone.js/1.1.2/backbone-min', 'components/backbone/backbone'],
        bootstrap: ['http://cdn.bootcss.com/bootstrap/3.2.0/js/bootstrap.min', 'components/bootstrap-sass-official/assets/javascripts/bootstrap'],
        handlebars: ['http://cdn.bootcss.com/handlebars.js/2.0.0-alpha.4/handlebars.amd', 'components/handlebars/handlebars.amd.min'],
        'underscore.string': ['http://cdn.bootcss.com/underscore.string/2.3.3/underscore.string.min', 'components/underscore.string/dist/underscore.string.min'],
        'spectrum': ['http://cdn.bootcss.com/spectrum/1.3.0/js/spectrum.min', 'components/spectrum/spectrum'],
        // vendors not using cdn
        'text': 'components/text/text',
        'css': 'components/require-css/css.min',
        // application
        'spg': 'js/admin/spu-pkg-generator'
    },
    urlArgs: "bust=" + (new Date()).getTime(),
    shim: {
        'underscore': {
            exports: '_',
        },
        'underscore.string': {
            deps: ['underscore'],
        },
        'backbone': {
            deps: ['jquery', 'underscore'],
            exports: 'Backbone',
        },
        'bootstrap': {
            deps: ['jquery'],
            exports: '$.fn.tooltip',
        },
        'spectrum': {
            deps: ['css!http://cdn.bootcss.com/spectrum/1.3.0/css/spectrum.min.css', 'jquery'],
            //deps: ['css!components/spectrum/spectrum.css', 'jquery'],
            exports: '$.fn.spectrum',
        },
    },
});


require(['spg/infrastructure'], function () {
    require(['spg/app'], function () {})
});
