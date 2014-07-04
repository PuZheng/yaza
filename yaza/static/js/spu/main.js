
require.config({
    baseUrl: '/static',
    map: {
        '*': {
            'css': 'components/require-css/css.min'
        }
    },
    paths: {
        // vendors using bootcss cdn
        jquery: ['http://cdn.bootcss.com/jquery/2.1.1/jquery.min', 'components/jquery/dist/jquery.min'],
        underscore: ['http://cdn.bootcss.com/underscore.js/1.6.0/underscore-min', 'components/underscore/underscore'],
        backbone: ['http://cdn.bootcss.com/backbone.js/1.1.2/backbone-min', 'components/backbone/backbone'],
        bootstrap: ['http://cdn.bootcss.com/bootstrap/3.2.0/js/bootstrap.min', 'components/bootstrap-sass-official/assets/javascripts/bootstrap'],
        handlebars: ['http://cdn.bootcss.com/handlebars.js/2.0.0-alpha.4/handlebars.amd', 'components/handlebars/handlebars.amd.min'],
        'underscore.string': ['http://cdn.bootcss.com/underscore.string/2.3.3/underscore.string.min', 'components/underscore.string/dist/underscore.string.min'],
        'jquery.ui.widget': ['http://cdn.bootcss.com/jqueryui/1.10.4/jquery-ui.min', 'components/jquery-ui/ui/jquery.ui.widget'],
        'cookies-js': ['http://cdn.bootcss.com/Cookies.js/0.4.0/cookies', 'components/cookies-js/src/cookies.min'],
        'select2': ['http://cdn.bootcss.com/select2/3.5.0/select2.min', 'components/select2/select2.min'],
        'svg': ['http://cdn.bootcss.com/svg.js/1.0rc3/svg.min', 'components/svg.js/dist/svg.min'],
        'block-ui': ['http://cdn.bootcss.com/jquery.blockUI/2.66.0-2013.10.09/jquery.blockUI', 'components/blockui/jquery.blockUI'],
        'spectrum': ['http://cdn.bootcss.com/spectrum/1.3.0/js/spectrum.min', 'components/spectrum/spectrum'],
        'zClip': ['http://cdn.bootcss.com/zclip/1.1.2/jquery.zclip.min', "components/zeroclipboard/dist/ZeroClipboard.min"],
        "jquery.scrollTo": ['http://cdn.bootcss.com/jquery-scrollTo/1.4.11/jquery.scrollTo.min', "components/jquery.scrollTo/jquery.scrollTo.min"],
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
    }
});

requirejs(['app']);
