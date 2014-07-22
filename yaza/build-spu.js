({
    baseUrl: 'static',
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
    optimize: "none",
    optimizeCss: "standard",
    dir: "static/dist",
    findNestedDependencies: true,
    modules: [
        {
            name: 'js/admin/spu/main',
            exclude: ['js/admin/spu/infrastructure'],
        },
        {
            name: 'js/admin/spu/infrastructure',
        }
    ]
})
