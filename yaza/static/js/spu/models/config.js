/**
 * Created by Young on 2014/7/24.
 */
define(['backbone'], function (Backbone) {

    var Config = Backbone.Model.extend({
        url: '/config',
        defaults: {
            FONT_FAMILY_LIST: [],
            DEFAULT_FONT_SIZE: '',  // in points (1/72 inch)
            DEFAULT_FONT_FAMILY: '',
            PPI: '',
            DEFAULT_FONT_COLOR: '',
            FONT_SIZE_LIST: [],
            CONTROL_POINT_NUM: [],
            DISPROPORTIONATE: '',
            MAGNET_TOLERANCE: '',  // 磁力吸附生效距离
            DOWNLOADABLE : '', // 是否可以下载定制结果,
            PLAYGROUND_MARGIN: '', // 留空部分大小
            DEFAULT_PREVIEW_BACKGROUND_COLOR: '',
            DESIGN_IMAGE_INTIAL_ZOOMNESS: '',
            PREVIEW_DOWNLOADABLE: '',
            DESIGN_DOWNLOADABLE: '',
            CLEAR_PREVIEW_BEFORE_DRAG: '',
            QINIU_CONF: {}
        }
    });

    return new Config();
});
