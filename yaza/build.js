({
    baseUrl: 'static',
    map: {
        '*': {
            'css': 'components/require-css/css.min'
        }
    },
    paths: {
        // vendors using bootcss cdn
        jquery: 'empty:',
        underscore: 'empty:',
        backbone: 'empty:',
        bootstrap: 'empty:',
        handlebars: 'empty:',
        'underscore.string': 'empty:',
        'jquery.ui.widget': 'empty:',
        'cookies-js': 'empty:',
        'select2': 'empty:'
        'svg': 'empty:',
        'block-ui': 'empty:',
        'spectrum': 'empty:',
        'zClip': 'empty:',
        "jquery.scrollTo": 'empty:',
        // vendors not using cdn
        'svg.export': 'components/svg.export.js/svg.export.min',
        kineticjs: 'components/kineticjs/kinetic.min',
        buckets: 'components/buckets/buckets',
        'jquery-file-upload': 'components/blueimp-file-upload/js/jquery.fileupload',
        'jquery.iframe-transport': 'components/jquery.iframe-transport/jquery.iframe-transport',
        'text': 'components/text/text',
        // application
        dispatcher: 'js/dispatcher',
        app: 'js/spu/app',
        'views/app-view': 'js/spu/views/app-view',
        'views/play-ground': 'js/spu/views/play-ground',
        'views/jit-preview': 'js/spu/views/jit-preview',
        config: 'js/spu/config',
        'color-tools': 'js/color-tools',
        'control-group': 'js/spu/control-group',
        'object-manager': 'js/spu/views/object-manager',
        colors: 'js/spu/colors',
        'collections/tags': 'js/spu/collections/tags',
        'models/tag': 'js/spu/models/tag',
        'collections/design-images': 'js/spu/collections/design-images',
        'models/design-image': 'js/spu/models/design-image',
        'lazy-load': 'js/utils/lazy-load',
        'cubic-interpolation': 'js/spu/core/cubic-interpolation',
        'linear-interpolation': 'js/spu/core/linear-interpolation',
    },
    shim: {
        'block-ui': {
            deps: ['jquery'],
        },
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
        'lazy-load': {
            deps: ['jquery'],
            exports: '$.fn.lazyLoad', 
        },
        'color-tools':{
            deps:['underscore', 'jquery']
        },
        'jquery-file-upload': {
            deps: ['css!components/blueimp-file-upload/css/jquery.fileupload.css', 'jquery.ui.widget']
        },
        'spectrum': {
            deps: ['css!http://cdn.bootcss.com/spectrum/1.3.0/css/spectrum.min.css', 'jquery'],
            //deps: ['css!components/spectrum/spectrum.css', 'jquery'],
            exports: '$.fn.spectrum',
        },
        'svg': {
            exports: 'SVG',
        },
        'svg.export': {
            deps: ['svg'],
        },
        'select2':{
            deps:['jquery', 'css!http://cdn.bootcss.com/select2/3.5.0/select2.min.css', 'css!http://cdn.bootcss.com/select2/3.5.0/select2-bootstrap.min.css']
            //deps:['jquery', 'css!components/select2/select2.css', 'css!components/select2/select2-bootstrap.css']
        },
        'buckets': {
            exports: 'buckets',
        },
        'zlib': {
            exports: 'Zlib',
        },
        'jquery.scrollTo': {
            deps: ['jquery']
        },
        'jquery.iframe-transport': {
            deps: ['jquery'],
        },
        'jquery.ui.widget': {
            deps: ['jquery'],
        },
    },
    removeCombined: true,
    preserveLicenseComments: false,
    optimizeCss: "standard",
    dir: "static/dist",
    modules: [
        {
            name: 'js/spu/main'
        },
    ]
})
