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
        'fancybox': 'http://cdn.bootcss.com/fancybox/2.1.5/jquery.fancybox.min',
        'jquery.ui.widget': ['http://cdn.bootcss.com/jqueryui/1.10.4/jquery-ui.min', 'components/jquery-ui/ui/jquery.ui.widget'],
        'toastr': 'http://cdn.bootcss.com/toastr.js/latest/js/toastr.min',
        'js-url': 'http://cdn.bootcss.com/js-url/1.8.4/url',
        // vendors not using cdn
        'jquery-file-upload': 'components/blueimp-file-upload/js/jquery.fileupload',
        'jquery.iframe-transport': 'components/jquery.iframe-transport/jquery.iframe-transport',
        'text': 'components/text/text',
        'css': 'components/require-css/css.min',
        // application
        dispatcher: 'js/dispatcher',
        'spu': 'js/admin/spu'
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
        'fancybox': {
            deps: ['css!http://cdn.bootcss.com/fancybox/2.1.5/jquery.fancybox.min.css', 'jquery'],
            exports: '$.fn.fancybox',
        },
        'jquery-file-upload': {
            deps: ['css!components/blueimp-file-upload/css/jquery.fileupload.css', 
                'css!components/blueimp-file-upload/css/jquery.fileupload-ui.css', 
            'jquery.ui.widget']
        },
        'jquery.ui.widget': {
            deps: ['jquery'],
        },
        'toastr': {
            deps: ["css!http://cdn.bootcss.com/toastr.js/latest/css/toastr.min.css"]
        },
        'js-url': {
            deps: ['jquery'],
            exports: '$.fn.url',
        },
    },
});


require(['spu/infrastructure'], function () {
    require(['spu/app'], function () {})
});
