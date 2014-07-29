({
    baseUrl: 'static',
    map: {
        '*': {
            'css': 'components/require-css/css.min'
        }
    },
    paths: {
        jquery: 'empty:',
        underscore: 'empty:',
        backbone: 'empty:',
        bootstrap: 'empty:',
        handlebars: 'empty:',
        'underscore.string': 'empty:',
        'spectrum': 'empty:',
        'fancybox': 'empty:',
        'jquery.ui.widget': 'empty:',
        'toastr': 'empty:',
        'js-url': 'empty:',
        "ekko-lightbox": 'empty:',
        // vendors not using cdn
        kineticjs: 'components/kineticjs/kinetic.min',
        'jquery-file-upload': 'components/blueimp-file-upload/js/jquery.fileupload',
        'jquery.iframe-transport': 'components/jquery.iframe-transport/jquery.iframe-transport',
        'text': 'components/text/text',
        'css': 'components/require-css/css.min',
        // application
        dispatcher: 'js/dispatcher',
        'spu': 'js/admin/spu'
    },
    removeCombined: true,
    preserveLicenseComments: false,
    //optimize: "none",
    optimizeCss: "standard",
    dir: "static/dist",
    findNestedDependencies: true,
    modules: [
        {
            name: 'js/admin/spu/main',
            exclude: ['js/admin/spu/infrastructure']
        },
        {
            name: 'js/admin/spu/infrastructure'
        }
    ],
    shim: {
        'underscore': {
            exports: '_'
        },
        'underscore.string': {
            deps: ['underscore']
        },
        'backbone': {
            deps: ['jquery', 'underscore'],
            exports: 'Backbone'
        },
        'bootstrap': {
            deps: ['jquery'],
            exports: '$.fn.tooltip'
        },
        'spectrum': {
            deps: ['css!http://cdn.bootcss.com/spectrum/1.3.0/css/spectrum.min.css', 'jquery'],
            //deps: ['css!components/spectrum/spectrum.css', 'jquery'],
            exports: '$.fn.spectrum'
        },
        'fancybox': {
            deps: ['css!http://cdn.bootcss.com/fancybox/2.1.5/jquery.fancybox.min.css', 'jquery'],
            exports: '$.fn.fancybox'
        },
        'jquery-file-upload': {
            deps: ['css!components/blueimp-file-upload/css/jquery.fileupload.css', 
                'css!components/blueimp-file-upload/css/jquery.fileupload-ui.css', 
            'jquery.ui.widget']
        },
        'jquery.ui.widget': {
            deps: ['jquery']
        },
        'toastr': {
            deps: ["css!http://cdn.bootcss.com/toastr.js/latest/css/toastr.min.css"]
        },
        'js-url': {
            deps: ['jquery'],
            exports: '$.fn.url'
        },
        'ekko-lightbox': {
            deps: ['bootstrap', "css!http://cdn.bootcss.com/ekko-lightbox/3.0.3a/ekko-lightbox.min.css"]
        }
    }
})
