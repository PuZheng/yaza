({
    baseUrl: 'static',
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
        bootstrap: 'components/bootstrap/dist/js/bootstrap.min',
        handlebars: 'components/handlebars/handlebars.amd.min',
        'underscore.string': 'components/underscore.string/dist/underscore.string.min',
        'jquery-file-upload': 'components/blueimp-file-upload/js/jquery.fileupload',
        'jquery.ui.widget': 'components/jquery-ui/ui/minified/jquery.ui.widget.min',
        'jquery.iframe-transport': 'components/jquery.iframe-transport/jquery.iframe-transport',
        'text': 'components/text/text',
        'cookies-js': 'components/cookies-js/src/cookies.min',
        'select2': 'components/select2/select2.min',
        // application
        dispatcher: 'js/dispatcher',
        app: 'js/spu/app',
        'views/app-view': 'js/spu/views/app-view',
        'views/play-ground': 'js/spu/views/play-ground',
        'views/jit-preview': 'js/spu/views/jit-preview',
    },
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
        'select2': {
            deps: ['css!//cdn.staticfile.org/select2/3.4.6/select2.min.css', 'css!//cdn.staticfile.org/select2/3.4.6/select2-bootstrap.css']
        },
        'jquery-file-upload': {
            deps: ['css!components/blueimp-file-upload/css/jquery.fileupload.css', 'css!components/blueimp-file-upload/css/jquery.fileupload-ui.css']
        }
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
