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
        FONT_FAMILY_LIST: [
            '文泉驿微米黑',
            'AR PL UMing CN',
            'AR PL UKai CN',
            '腾祥铁山硬隶繁',
        ],
        MAGNIFY: 1.5,  // 预览放大的倍数
        CONTROL_POINT_NUM: [64, 64],
        INTERPOLATION_METHOD: "bicubic",
        DISPROPORTIONATE: true,
        MAGNET_TOLERANCE: 5,  // 磁力吸附生效距离
    }
});
