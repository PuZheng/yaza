define(function () {
    return {
        DEFAULT_FONT_SIZE: 128,  // in points (1/72 inch)
        DEFAULT_FONT_FAMILY: "AR PL UMing CN",
        PPI: 100,
        DEFAULT_FONT_COLOR: "black",
        FONT_SIZE_LIST: [
            256,
            224,
            192,
            160,
            128, 
            96,
            64,
            32,
        ],
        MAGNIFY: 1.5,  // 预览放大的倍数
        CONTROL_POINT_NUM: [4, 4],
        DISPROPORTIONATE: true,
        MAGNET_TOLERANCE: 5,  // 磁力吸附生效距离
        DOWNLOADABLE : true, // 是否可以下载定制结果,
        PLAYGROUND_MARGIN: 180, // 留空部分大小
        PLAYGROUND_PADDING: 50 // 留空部分大小
    }
});
