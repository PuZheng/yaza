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
        'jquery.ui.widget': ['http://cdn.bootcss.com/jqueryui/1.10.4/jquery-ui.min', 'components/jquery-ui/ui/jquery.ui.widget'],
        'cookies-js': ['http://cdn.bootcss.com/Cookies.js/0.4.0/cookies', 'components/cookies-js/src/cookies.min'],
        'select2': ['http://cdn.bootcss.com/select2/3.5.0/select2.min', 'components/select2/select2.min'],
        'svg': ['http://cdn.bootcss.com/svg.js/1.0rc3/svg.min', 'components/svg.js/dist/svg.min'],
        'block-ui': ['http://cdn.bootcss.com/jquery.blockUI/2.66.0-2013.10.09/jquery.blockUI', 'components/blockui/jquery.blockUI'],
        'spectrum': ['http://cdn.bootcss.com/spectrum/1.3.0/js/spectrum.min', 'components/spectrum/spectrum'],
        'zClip': ['http://cdn.bootcss.com/zclip/1.1.2/jquery.zclip.min', "components/zeroclipboard/dist/ZeroClipboard.min"],
        'js-url': 'http://cdn.bootcss.com/js-url/1.8.4/url',
        "jquery.scrollTo": ['http://cdn.bootcss.com/jquery-scrollTo/1.4.11/jquery.scrollTo.min', "components/jquery.scrollTo/jquery.scrollTo.min"],
        // vendors not using cdn
        'svg.export': 'components/svg.export.js/svg.export',
        kineticjs: 'components/kineticjs/kinetic.min',
        buckets: 'components/buckets/buckets',
        'jquery-file-upload': 'components/blueimp-file-upload/js/jquery.fileupload',
        'jquery.iframe-transport': 'components/jquery.iframe-transport/jquery.iframe-transport',
        'text': 'components/text/text',
        'css': 'components/require-css/css.min',
        "autosize": ["http://cdn.bootcss.com/autosize.js/1.18.9/jquery.autosize.min", "components/autosize/jquery.autosize.min"],
        'jquery-ajaxtransport-xdomainrequest': ["http://cdn.bootcss.com/jquery-ajaxtransport-xdomainrequest/1.0.2/jquery.xdomainrequest.min",
            "components/jquery-ajaxtransport-xdomainrequest/jquery.xdomainrequest.min"],
        "getImageData": "components/getImageData/jquery.getimagedata.min",
        "jszip": ["http://cdn.bootcss.com/jszip/2.3.0/jszip.min", "components/jszip/dist/jszip.min"],
        "filesaver":"components/FileSaver/FileSaver",
        // application
        dispatcher: 'js/dispatcher',
        'utils': 'js/utils',
        'color-tools': 'js/color-tools',
        'spu': 'js/spu',
        'js/infrastructure': ['http://yaza.qiniudn.com/js/infrastructure', 'js/infrastructure']
    },
    urlArgs: "bust=" + (new Date()).getTime(),
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
        'color-tools':{
            deps:['underscore', 'jquery']
        },
        'jquery-file-upload': {
            deps: ['css!components/blueimp-file-upload/css/jquery.fileupload.css', 
                'css!components/blueimp-file-upload/css/jquery.fileupload-ui.css', 
            'jquery.ui.widget']
        },
        'spectrum': {
            deps: ['css!http://cdn.bootcss.com/spectrum/1.3.0/css/spectrum.min.css', 'jquery'],
            //deps: ['css!components/spectrum/spectrum.css', 'jquery'],
            exports: '$.fn.spectrum'
        },
        'svg': {
            exports: 'SVG'
        },
        'svg.export': {
            deps: ['svg']
        },
        'select2':{
            deps:['jquery', 'css!http://cdn.bootcss.com/select2/3.5.0/select2.min.css', 'css!http://cdn.bootcss.com/select2/3.5.0/select2-bootstrap.min.css']
            //deps:['jquery', 'css!components/select2/select2.css', 'css!components/select2/select2-bootstrap.css']
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
        'autosize':{
            deps: ['jquery']
        },
        'getImageData' :{
            deps: ['jquery']
        },
        'js-url': {
            deps: ['jquery'],
            exports: '$.fn.url'
        },
    }
});

// force loading jquery, svg before infrastructure, since infrastructure need
// them after compression
require(['jquery', 'svg'], function () {
    require(['js/infrastructure'], function () {
        require(['spu/app'], function () {});  
    });
});
