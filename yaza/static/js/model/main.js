require.config({
    baseUrl: '/static',
    map:{
        '*':{
            'css':'components/require-css/css.min'
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
        'jquery-file-upload': 'components/blueimp-file-upload/js/jquery.fileupload',
        'jquery.ui.widget': 'components/jquery-ui/ui/minified/jquery.ui.widget.min',
        'jquery.iframe-transport': 'components/jquery.iframe-transport/jquery.iframe-transport',
        'text': 'components/text/text',
        'cookies-js': 'components/cookies-js/src/cookies.min',
        "image-picker":'components/image-picker/image-picker/image-picker.min',
        'select2':['//cdn.staticfile.org/select2/3.4.6/select2.min', 'components/select2/select2.min'],
        // application
        app: 'js/model/app',
        'views/app-view': 'js/model/views/app-view',
        'views/play-ground': 'js/model/views/play-ground',
    },
    urlArgs: "bust=" + (new Date()).getTime(),
    shim: {
        'underscore': {
            exports: '_',
        },
        'backbone': {
            deps: ['jquery', 'underscore'],
            exports: 'Backbone',
        },
        'bootstrap': {
            deps: ['jquery'],
            exports: '$.fn.tooltip',
        },
        'image-picker':{
            deps:['jquery', 'css!components/image-picker/image-picker/image-picker.css']
        },
        'select2':{
            deps:['css!//cdn.staticfile.org/select2/3.4.6/select2.min.css', 'css!//cdn.staticfile.org/select2/3.4.6/select2-bootstrap.css']
        }
    }
});

requirejs(['app']);
