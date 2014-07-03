require.config({
    baseUrl: '/static',
    map: {
        '*': {
            'css': 'components/require-css/css.min'
        }
    },
    paths: {
        // vendors
        jquery: 'components/jquery/dist/jquery.min',
        underscore: 'components/underscore/underscore',
        kineticjs: 'components/kineticjs/kinetic.min',
        backbone: 'components/backbone/backbone',
        bootstrap: 'components/bootstrap-sass-official/assets/javascripts/bootstrap',
        handlebars: 'components/handlebars/handlebars.amd.min',
        buckets: 'components/buckets/buckets',
        'underscore.string': 'components/underscore.string/dist/underscore.string.min',
        'jquery-file-upload': 'components/blueimp-file-upload/js/jquery.fileupload',
        'jquery.ui.widget': 'components/jquery-ui/ui/jquery.ui.widget',
        'jquery.iframe-transport': 'components/jquery.iframe-transport/jquery.iframe-transport',
        'text': 'components/text/text',
        'cookies-js': 'components/cookies-js/src/cookies.min',
        'select2': 'components/select2/select2.min',
        'svg': 'components/svg.js/dist/svg.min',
        'svg.export': 'components/svg.export.js/svg.export.min',
        'block-ui': 'components/blockui/jquery.blockUI',
        'spectrum': 'components/spectrum/spectrum',
        'zClip':"components/zeroclipboard/dist/ZeroClipboard.min",
        "jquery.scrollTo": "components/jquery.scrollTo/jquery.scrollTo.min",
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
    urlArgs: "bust=" + (new Date()).getTime(),
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
            deps: ['css!components/blueimp-file-upload/css/jquery.fileupload.css']
        },
        'spectrum': {
            deps: ['css!components/spectrum/spectrum.css'],
            exports: '$.fn.spectrum',
        },
        'svg': {
            exports: 'SVG',
        },
        'svg.export': {
            deps: ['svg'],
        },
        'select2':{
            deps:['jquery', 'css!components/select2/select2.css', 'css!components/select2/select2-bootstrap.css']
        },
        'buckets': {
            exports: 'buckets',
        },
        'zlib': {
            exports: 'Zlib',
        },
        'jquery.scrollTo': {
            deps: ['jquery']
        }
    }
});

requirejs(['app']);
