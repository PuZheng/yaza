(function () {
    var config = {
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
            'spectrum': ['http://cdn.bootcss.com/spectrum/1.3.0/js/spectrum.min', 'components/spectrum/spectrum'],
            'fancybox': 'http://cdn.bootcss.com/fancybox/2.1.5/jquery.fancybox.min',
            'jquery.ui.widget': ['http://cdn.bootcss.com/jqueryui/1.10.4/jquery-ui.min', 'components/jquery-ui/ui/jquery.ui.widget'],
            'toastr': 'http://cdn.bootcss.com/toastr.js/latest/js/toastr.min',
            'js-url': 'http://cdn.bootcss.com/js-url/1.8.4/url',
            "ekko-lightbox": 'http://cdn.bootcss.com/ekko-lightbox/3.0.3a/ekko-lightbox.min',
            // vendors not using cdn
            kineticjs: 'components/kineticjs/kinetic.min',
            'jquery-file-upload': 'components/blueimp-file-upload/js/jquery.fileupload',
            'jquery.iframe-transport': 'components/jquery.iframe-transport/jquery.iframe-transport',
            'text': 'components/text/text',
            'css': 'components/require-css/css.min',
            // application
            dispatcher: 'js/dispatcher',
            'admin/spu': 'js/admin/spu',
        },
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
    };

    var QueryString = function () {
        // This function is anonymous, is executed immediately and 
        // the return value is assigned to QueryString!
        var query_string = {};
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i=0;i<vars.length;i++) {
            var pair = vars[i].split("=");
            // If first entry with this name
            if (typeof query_string[pair[0]] === "undefined") {
                query_string[pair[0]] = pair[1];
                // If second entry with this name
            } else if (typeof query_string[pair[0]] === "string") {
                var arr = [ query_string[pair[0]], pair[1] ];
                query_string[pair[0]] = arr;
                // If third or later entry with this name
            } else {
                query_string[pair[0]].push(pair[1]);
            }
        } 
        return query_string;
    }();

    if (QueryString.develop != '1') {
        config.paths['js/admin/spu/infrastructure'] = 'http://yaza-static.qiniudn.com/static/js/admin/spu/infrastructure';
    } else {
        config.urlArgs = "bust=" + (new Date()).getTime();
    }
    require.config(config);
    require(['jquery'], function () {
        require(['js/admin/spu/infrastructure'], function () {
            require(['js/admin/spu/app'], function () {})
        });
    });
})();
