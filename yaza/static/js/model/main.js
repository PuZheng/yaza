require.config({
    baseUrl: '/static',
    paths: {
        // vendors
        jquery: 'components/jquery/dist/jquery.min',
        underscore: 'components/underscore/underscore',
        kineticjs: 'components/kineticjs/kinetic.min',
        backbone: 'components/backbone/backbone',
        bootstrap: 'components/bootstrap/dist/js/bootstrap.min',
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
        }
    }
});

requirejs(['app']);
