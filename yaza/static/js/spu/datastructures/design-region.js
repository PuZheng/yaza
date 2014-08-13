define(['jquery', 'underscore', 'buckets', 'utils/read-image-data',
        'kineticjs', 'spu/config', 'js-url'],
    function ($, _, bucket, readImageData, Kinetic, config) {

        var __debug__ = ($.url('?debug') == '1');
        var _imageLayerMap = {};
        var _controlLayerMap = {};

        function DesignRegion(data) {
            this.id = data.id;
            this.picUrl = data.picUrl;
            this.edgeUrl = data.edgeUrl;
            this.size = data.size;
            this.name = data.name;
            // 若不支持cors， 需要从本地获取数据
            this.blackShadowUrl = $.support.cors? data.blackShadowUrl: data.localBlackShadowUrl;
            this.whiteShadowUrl = $.support.cors? data.whiteShadowUrl: data.localWhiteShadowUrl;
            this.crossDomain = $.support.cors;
            this.aspect = data.aspect;
            this.previewLayer = new Kinetic.Layer();  // 预览层
            if (__debug__) {
                this.getControlLayer().add(new Kinetic.Rect({
                    strokeWidth: '1px',
                    stroke: 'blue',
                    name: 'frame'
                }));
            }
            return this;
        }


        // 图像层， 即平铺的图像, 同名的设计区， 使用同一个图像层
        DesignRegion.prototype.getImageLayer = function () {
            var imageLayer = _imageLayerMap[this.name];
            if (!imageLayer) {
                imageLayer = new Kinetic.Layer();
                _imageLayerMap[this.name] = imageLayer;
            }

            return imageLayer;
        };

        DesignRegion.prototype.getControlLayer = function () {
            var controlLayer = _controlLayerMap[this.name];
            if (!controlLayer) {
                controlLayer = new Kinetic.Layer();
                _controlLayerMap[this.name] = controlLayer;
            }

            return controlLayer;
        };

        DesignRegion.prototype.getPreviewEdges = function (proportion) {
            var d = $.Deferred();
            if (this.previewEdges) {
                d.resolve(this.previewEdges);
            } else {
                var success = function (dr) {
                    return function (edges) {
                        var previewEdges = dr.previewEdges = {};
                        // 这里必须要去重，否则边界计算错误
                        // 而且需要注意的是， 缩放过的线段可能会产生锯齿.
                        // 比如一种典型的情况是： top上， 有两个点x一样， y相邻,
                        // 这样会给判断点是否在边界上带来麻烦

                        // 特别注意， 当propotion > 1的时候， 其实是放大， 那么必然产生了
                        // 非闭合曲线，由于在yaza中， 不会出现原图小于浏览器上图片的情况，
                        // 所以这种情况不予考虑

                        var set = new buckets.Set();
                        ['top', 'left', 'bottom', 'right'].forEach(function (position) {
                            previewEdges[position] = [];
                            edges[position].forEach(function (point) {
                                var p = [Math.round(point[0] * proportion.x), Math.round(point[1] * proportion.y)];
                                if (!set.contains(p)) {
                                    set.add(p);
                                    previewEdges[position].push(p);
                                }
                            });
                        });

                        d.resolve(dr.previewEdges);
                    };
                }(this);
                if ($.support.cors) {
                    $.getJSON(this.edgeUrl, success);
                } else {
                    var xdr = new XDomainRequest();
                    xdr.open("get", this.edgeUrl);
                    xdr.onload = function () {
                        success(JSON.parse(xdr.responseText));
                    }
                    xdr.send();
                }
            }
            return d;
        };

        DesignRegion.prototype.getPreviewTop = function () {
            if (!this._previewTop) {
                this._previewTop = 0;
                ['top', 'left', 'right'].forEach(function (position) {
                    this.previewEdges[position].forEach(function (point) {
                        if (point[1] > this._previewTop) {
                            this._previewTop = point[1];
                        }
                    }, this);
                }, this);
            }
            return this._previewTop;
        };

        DesignRegion.prototype.getPreviewBottom = function () {
            if (!this._previewBottom) {
                this._previewBottom = Number.MAX_VALUE;
                ['bottom', 'left', 'right'].forEach(function (position) {
                    this.previewEdges[position].forEach(function (point) {
                        if (point[1] < this._previewBottom) {
                            this._previewBottom = point[1];
                        }
                    }, this);
                }, this);
            }
            return this._previewBottom;
        };

        DesignRegion.prototype.getPreviewLeft = function () {
            if (!this._previewLeft) {
                this._previewLeft = Number.MAX_VALUE;
                ['top', 'bottom', 'left'].forEach(function (position) {
                    this.previewEdges[position].forEach(function (point) {
                        if (point[0] < this._previewLeft) {
                            this._previewLeft = point[0];
                        }
                    }, this);
                }, this);
            }
            return this._previewLeft;
        };

        DesignRegion.prototype.getPreviewRight = function () {
            if (!this._previewRight) {
                this._previewRight = 0;
                ['top', 'left', 'right'].forEach(function (position) {
                    this.previewEdges[position].forEach(function (point) {
                        if (point[0] > this._previewRight) {
                            this._previewRight = point[0];
                        }
                    }, this);
                }, this);
            }
            return this._previewRight;
        };


        DesignRegion.prototype.getPreviewWidth = function () {
            return this.getPreviewRight() - this.getPreviewLeft();
        };

        DesignRegion.prototype.getPreviewHeight = function () {
            return this.getPreviewTop() - this.getPreviewBottom();
        };

        DesignRegion.prototype.getBounds = function () {
            if (this._bounds) {
                return this._bounds;
            }

            if (!this.previewEdges) {
                throw 'please call DesignRegion.getPreviewEdges at first!'
            }

            // 注意, 投射区域中, 不是说top边上的任何一个点都在left的右边, 也不是
            // 都在bottom的上面. 这里唯一要求的是, 这四个边组成了一个封闭区域.
            // 那么我们就要将四个边放在一起考虑, 给定任何一个y, 左右边界是什么,
            // 给定任何一个x, 上下边界是什么, 但是要注意， 有些边界点可能是平行的。
            // 举例来说， 比如在top上， 有两个边界点有同样的x
            this._bounds = {
                leftRight: {},
                topBottom: {}
            };
            var edges = this.previewEdges;
            var bounds = this._bounds;
            ['top', 'right', 'bottom', 'left'].forEach(function (edgeName) {
                edges[edgeName].forEach(function (point) {
                    if (bounds.topBottom[point[0]]) {
                        bounds.topBottom[point[0]].push(point[1]);
                    } else {
                        bounds.topBottom[point[0]] = [point[1]];
                    }
                    if (bounds.leftRight[point[1]]) {
                        bounds.leftRight[point[1]].push(point[0]);
                    } else {
                        bounds.leftRight[point[1]] = [point[0]];
                    }
                });
            });

            for (var x in this._bounds.topBottom) {
                this._bounds.topBottom[x] = {
                    bottom: Math.min.apply(Math, this._bounds.topBottom[x]),
                    top: Math.max.apply(Math, this._bounds.topBottom[x]),
                    innerPoints: this._bounds.topBottom[x].sort().slice(1, -1)
                }
            }
            for (var y in this._bounds.leftRight) {
                this._bounds.leftRight[y] = {
                    left: Math.min.apply(Math, this._bounds.leftRight[y]),
                    right: Math.max.apply(Math, this._bounds.leftRight[y]),
                    innerPoints: this._bounds.leftRight[y].sort().slice(1, -1)
                };
            }
            return this._bounds;
        };

        DesignRegion.prototype.getBlackShadow = function (width, height) {
            var d = $.Deferred();
            if (this.blackShadowImageData) {
                d.resolve(this.blackShadowImageData);
                return d;
            }

            var blackImageObj = new Image();
            blackImageObj.crossOrigin = "Anonymous";
            blackImageObj.onload = function () {
                this.blackShadowImageData = readImageData.readImageData(blackImageObj, width, height);
                d.resolve('black');
            }.bind(this);
            $.ajax({url: this.blackShadowUrl, crossDomain: this.crossDomain}).done(
                function () {
                    blackImageObj.src = this.blackShadowUrl;
                }.bind(this));

            return d;
        };

        DesignRegion.prototype.getWhiteShadow = function (width, height) {
            var d = $.Deferred();
            if (this.whiteShadowImageData) {
                d.resolve(this.whiteShadowImageData);
                return d;
            }
            var whiteImageObj = new Image();
            whiteImageObj.crossOrigin = "Anonymous";
            whiteImageObj.onload = function () {
                this.whiteShadowImageData = readImageData.readImageData(whiteImageObj, width, height);
                d.resolve('white');
            }.bind(this);
            $.ajax({url: this.whiteShadowUrl, crossDomain: this.crossDomain}).done(
                function () {
                    whiteImageObj.src = this.whiteShadowUrl;
                }.bind(this));
            return d;
        };

        DesignRegion.prototype.clearLayers = function () {
            this.previewLayer.remove();
            this.getControlLayer().remove();
            this.getImageLayer().remove();
        };

        DesignRegion.prototype.controlPointsMap = function (imageLayer) {
            if (!this._controlPointsMap) {
                this._controlPointsMap = this._calcControlPoints(this.previewEdges,
                    imageLayer.size(),
                    config.CONTROL_POINT_NUM);
            }
            return this._controlPointsMap;
        };

        DesignRegion.prototype._calcControlPoints = function (edges, size, cpNum) {
            var cpMap = [];
            var width = size.width;
            var height = size.height;
            // top
            var step1 = edges['top'].length / (cpNum[0] - 1);
            var step2 = width / (cpNum[0] - 1);
            // anchor the top right corner
            var top = _.clone(edges['top']).reverse();
            cpMap.push([top[top.length - 1], [width - 1, height - 1]]);
            // note! we omit the top left corner
            for (var i = cpNum[0] - 2; i > 0; --i) {
                cpMap.push([
                    top[parseInt(Math.round(i * step1))],
                    [parseInt(Math.round(i * step2)), height - 1]
                ]);
            }

            // left
            var step1 = edges['left'].length / (cpNum[1] - 1);
            var step2 = height / (cpNum[1] - 1);
            // anchor the top left corner
            var left = _.clone(edges['left']).reverse();
            cpMap.push([left[left.length - 1], [0, height - 1]]);
            for (var i = cpNum[1] - 2; i > 0; --i) {
                cpMap.push([
                    left[parseInt(Math.round(i * step1))],
                    [0, parseInt(Math.round(i * step2))]
                ]);
            }

            // bottom
            var step1 = edges['bottom'].length / (cpNum[0] - 1);
            var step2 = width / (cpNum[0] - 1);
            var bottom = edges['bottom'];
            // anchor the left bottom corner
            cpMap.push([bottom[0], [0, 0]]);
            for (var i = 1; i < cpNum[0] - 1; ++i) {
                cpMap.push([
                    bottom[parseInt(Math.round(i * step1))],
                    [parseInt(Math.round(i * step2)), 0]
                ]);
            }

            // right
            var step1 = edges['right'].length / (cpNum[1] - 1);
            var step2 = height / (cpNum[1] - 1);
            var right = edges['right'];
            // anchor the bottom right corner
            cpMap.push([right[0], [width - 1, 0]]);
            for (var i = 1; i < cpNum[1] - 1; ++i) {
                cpMap.push([
                    right[parseInt(Math.round(i * step1))],
                    [width - 1, parseInt(Math.round(i * step2))]
                ]);
            }
            return cpMap;
        };

        DesignRegion.prototype.within = function (x, y) {
            var test = 0;
            var bounds = this.getBounds();
            var leftRight = bounds.leftRight[y];
            var topBottom = bounds.topBottom[x];
            if (!(leftRight && topBottom)) {
                return false;
            }
            // 必须在四个边界中
            test += (x > leftRight.left);
            test += (x < leftRight.right);
            test += (y > topBottom.bottom);
            test += (y < topBottom.top);
            // 必须不能在边界上
            return test == 4 && !leftRight.innerPoints.some(function (x_) {
                return x_ == x;
            }) && !topBottom.innerPoints.some(function (y_) {
                return y_ == y;
            });
        };

        return DesignRegion;
    });
