define (['spu/core/cubic-interpolation', 'spu/core/linear-interpolation'], 
function (bicubic, bilinear) {


    function composeBicubicMatrix(left, bottom, srcImageData, srcWidth, srcHeight, backgroundColor, ret) {
        var pos0 = (left + bottom * srcWidth) * 4;
        // 在大多数情况下， 点不会在边界上
        if (left > 0 && left + 3 < srcWidth && bottom > 0 && bottom + 3 < srcHeight) {
            for (var i = 0; i < 4; ++i) {
                for (var j = 0; j < 4; ++j) {
                    for (var k = 0; k < 4; ++k) {
                        ret[i][j][k] = srcImageData[pos0 + (j * srcWidth + k) * 4 + i];
                    }
                }
            }
            return ret;
        }

        // 第一行， 需要考虑left在边界外， bottom在边界外， left+3在边界外的情况
        if (left < 0 || bottom < 0) {
            for (var offset = 0; offset < 4; ++offset) {
                ret[offset][0][0] = backgroundColor[offset];
            }
        } else {
            for (var offset = 0; offset < 4; ++offset) {
                ret[offset][0][0] = srcImageData[pos0 + offset];
            }
        }

        if (bottom < 0) {
            for (var offset = 0; offset < 4; ++offset) {
                ret[offset][0][1] = backgroundColor[offset];
                ret[offset][0][2] = backgroundColor[offset];
            }
        } else {
            for (var offset = 0; offset < 4; ++offset) {
                ret[offset][0][1] = srcImageData[pos0 + 4 + offset];
                ret[offset][0][2] = srcImageData[pos0 + 8 + offset]
            }
        }

        if (left + 3 >= srcWidth || bottom < 0) {
            for (var offset = 0; offset < 4; ++offset) {
                ret[offset][0][3] = backgroundColor[offset];
            }
        } else {
            for (var offset = 0; offset < 4; ++offset) {
                ret[offset][0][3] = srcImageData[pos0 + 12 + offset];
            }
        }

        // 第2, 3行， 需要考虑left在边界外, left + 3在边界外

        var pos1 = pos0 + srcWidth * 4;
        var pos2 = pos1 + srcWidth * 4;
        if (left < 0) {
            for (var offset = 0; offset < 4; ++offset) {
                ret[offset][1][0] = backgroundColor[offset];
                ret[offset][2][0] = backgroundColor[offset];
            }
        } else {
            for (var offset = 0; offset < 4; ++offset) {
                ret[offset][1][0] = srcImageData[pos1 + offset];
                ret[offset][2][0] = srcImageData[pos2 + offset];
            }
        }
        for (var offset = 0; offset < 4; ++offset) {
            ret[offset][1][1] = srcImageData[pos1 + 4 + offset];
            ret[offset][1][2] = srcImageData[pos1 + 8 + offset]
            ret[offset][2][1] = srcImageData[pos2 + 4 + offset];
            ret[offset][2][2] = srcImageData[pos2 + 8 + offset]
        }
        if (left + 3 >= srcWidth) {
            for (var offset = 0; offset < 4; ++offset) {
                ret[offset][1][3] = backgroundColor[offset];
                ret[offset][2][3] = backgroundColor[offset];
            }
        } else {
            for (var offset = 0; offset < 4; ++offset) {
                ret[offset][1][3] = srcImageData[pos1 + 12 + offset];
                ret[offset][2][3] = srcImageData[pos2 + 12 + offset];
            }
        }

        // 第4行， 需要考虑left在边界外， bottom + 3在边界外， left+3在边界外的情况
        var pos3 = pos2 + srcWidth * 4;
        if (left < 0 || bottom + 3 >= srcHeight) {
            for (var offset = 0; offset < 4; ++offset) {
                ret[offset][3][0] = backgroundColor[offset];
            }
        } else {
            for (var offset = 0; offset < 4; ++offset) {
                ret[offset][3][0] = srcImageData[pos3 + offset];
            }
        }

        if (bottom + 3 >= srcHeight) {
            for (var offset = 0; offset < 4; ++offset) {
                ret[offset][3][1] = backgroundColor[offset];
                ret[offset][3][2] = backgroundColor[offset];
            }
        } else {
            for (var offset = 0; offset < 4; ++offset) {
                ret[offset][3][1] = srcImageData[pos3 + 4 + offset];
                ret[offset][3][2] = srcImageData[pos3 + 8 + offset]
            }
        }

        if (left + 3 >= srcWidth || bottom + 3 >= srcHeight) {
            for (var offset = 0; offset < 4; ++offset) {
                ret[offset][3][3] = backgroundColor[offset];
            }
        } else {
            for (var offset = 0; offset < 4; ++offset) {
                ret[offset][3][3] = srcImageData[pos3 + 12 + offset];
            }
        }

        return ret;
    }

    function bicubicInterpolation(destImageData, destPoint, destWidth, destHeight, srcImageData, srcPoint, srcWidth, srcHeight, backgrounColor, pointsMatrix) {
        // find the 16 points
        var pos = (destPoint[0] + destPoint[1] * destWidth) * 4;

        var left = Math.floor(srcPoint[0]) - 1;
        var bottom = Math.floor(srcPoint[1]) - 1;

        var x = srcPoint[0] - Math.floor(srcPoint[0]);
        var y = srcPoint[1] - Math.floor(srcPoint[1]);
        composeBicubicMatrix(left, bottom, srcImageData, srcWidth, srcHeight, backgrounColor, pointsMatrix);
        destImageData.data[pos + 3] = bicubic(pointsMatrix[3], x, y);
        if (destImageData.data[pos + 3] == 0) {
            return;
        }
        destImageData.data[pos] = bicubic(pointsMatrix[0], x, y);
        destImageData.data[pos + 1] = bicubic(pointsMatrix[1], x, y);
        destImageData.data[pos + 2] = bicubic(pointsMatrix[2], x, y);
    }

    function composeEdgeMatrix(left, bottom, imageData, srcWidth, srcHeight, complementImageData, ret) {
        // 若是发现某个点是透明的， 拿背景图去填
        var pos0 = (left + bottom * srcWidth) * 4;
        for (var i = 0; i < 3; ++i) {
            for (var j = 0; j < 3; ++j) {
                if ((ret[3][i][j] = imageData[pos0 + (i * srcWidth + j) * 4 + 3]) != 0) {
                    ret[0][i][j] = imageData[pos0 + (i * srcWidth + j) * 4];
                    ret[1][i][j] = imageData[pos0 + (i * srcWidth + j) * 4 + 1];
                    ret[2][i][j] = imageData[pos0 + (i * srcWidth + j) * 4 + 2];
                } else {
                    ret[0][i][j] = complementImageData[pos0 + (i * srcWidth + j) * 4];
                    ret[1][i][j] = complementImageData[pos0 + (i * srcWidth + j) * 4 + 1];
                    ret[2][i][j] = complementImageData[pos0 + (i * srcWidth + j) * 4 + 2];
                    ret[3][i][j] = complementImageData[pos0 + (i * srcWidth + j) * 4 + 3];
                }
            }
        }
        return ret;

    }

    function edgeInterpolation(imageData, point, width, height, backgroundImageData, pointsMatrix) {
        var pos = (point[0] + point[1] * width) * 4;

        var left = point[0] - 1;
        var bottom = point[1] - 1;

        composeEdgeMatrix(left, bottom, imageData.data, width, height, backgroundImageData, pointsMatrix);
        // 不知道为什么bicubic效果很差
        imageData.data[pos + 3] = bilinear(pointsMatrix[3]);
        if (imageData.data[pos + 3] == 0) {
            return;
        }
        imageData.data[pos] = bilinear(pointsMatrix[0]);
        imageData.data[pos + 1] = bilinear(pointsMatrix[1]);
        imageData.data[pos + 2] = bilinear(pointsMatrix[2]);
    }
    
    return {
        bicubicInterpolation: bicubicInterpolation,
        edgeInterpolation: edgeInterpolation,
    }
});
