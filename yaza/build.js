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
        'jquery.ui.widget': 'empty:',
        'cookies-js': 'empty:',
        'select2': 'empty:',
        'svg': 'empty:',
        'block-ui': 'empty:',
        'spectrum': 'empty:',
        'zClip': 'empty:',
        "jquery.scrollTo": 'empty:',
        'js-url': 'empty:',
        'toastr': 'empty:',
        "ekko-lightbox": 'empty:',
        'fancybox': 'empty:',
        "jszip": "empty:",
        "autosize": 'empty:',
        'jquery-ajaxtransport-xdomainrequest': "empty:",
        // vendors not using cdn
        'svg.export': 'components/svg.export.js/svg.export.min',
        kineticjs: 'components/kineticjs/kinetic.min',
        buckets: 'components/buckets/buckets',
        'jquery-file-upload': 'components/blueimp-file-upload/js/jquery.fileupload',
        'jquery.iframe-transport': 'components/jquery.iframe-transport/jquery.iframe-transport',
        'text': 'components/text/text',
        "filesaver":"components/FileSaver/FileSaver",
        'css': 'components/require-css/css.min',
        // application
        'infrastructure': 'js/infrastructure',
        dispatcher: 'js/dispatcher',
        'utils': 'js/utils',
        'lazy-load': 'js/utils/lazy-load',
        'color-tools': 'js/color-tools',
        'spu': 'js/spu',
        'admin/spu': 'js/admin/spu'
    },
    skipDirOptimize: true,
    removeCombined: true,
    preserveLicenseComments: false,
    //optimize: "none",
    optimizeCss: "standard",
    dir: "static/dist",
    findNestedDependencies: true,
    modules: [
        {
            name: 'js/spu/main',
            exclude: ['js/infrastructure']
        },
        {
            name: 'js/infrastructure'
        },
        {
            name: 'js/admin/spu/main',
            exclude: ['js/admin/spu/infrastructure']
        },
        {
            name: 'js/admin/spu/infrastructure'
        }
    ],
    shim: {
        'block-ui': {
            deps: ['jquery']
        },
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
        'lazy-load': {
            deps: ['jquery'],
            exports: '$.fn.lazyLoad'
        },
        'color-tools': {
            deps: ['underscore', 'jquery']
        },
        'jquery-file-upload': {
            deps: ['css!components/blueimp-file-upload/css/jquery.fileupload.css', 'jquery.ui.widget']
        },
        'spectrum': {
            deps: ['css!http://cdn.bootcss.com/spectrum/1.3.0/css/spectrum.min.css', 'jquery'],
            exports: '$.fn.spectrum'
        },
        'svg': {
            exports: 'SVG'
        },
        'svg.export': {
            deps: ['svg']
        },
        'select2': {
            deps: ['jquery', 'css!http://cdn.bootcss.com/select2/3.5.0/select2.min.css', 'css!http://cdn.bootcss.com/select2/3.5.0/select2-bootstrap.min.css']
        },
        'buckets': {
            exports: 'buckets'
        },
        'zlib': {
            exports: 'Zlib'
        },
        'jquery.scrollTo': {
            deps: ['jquery']
        },
        'jquery.iframe-transport': {
            deps: ['jquery']
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
        }
    }
})
