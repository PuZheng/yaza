define(['jquery', 'buckets', 'utils/read-image-data', 'kineticjs'], function ($, bucket, readImageData, Kinetic) {
        
    function DesignRegion(data) {
        this.id = data.id;
        this.picUrl = data.picUrl;
        this.edgeUrl = data.edgeUrl;
        this.size = data.size;
        this.name = data.name;
        this.blackShadowUrl = data.blackShadowUrl;
        this.whiteShadowUrl = data.whiteShadowUrl;
        this.aspect = data.aspect;
        this.previewLayer = new Kinetic.Layer();  // 预览层
        this.controlLayer = new Kinetic.Layer();  // 操作层
        this.imageLayer = new Kinetic.Layer();  // 图像层， 即平铺的图像
        return this;
    }


    DesignRegion.prototype.getPreviewEdges = function (proportion) {
        var d = $.Deferred();
        if (this.previewEdges) {
            d.resolve(this.previewEdges); 
        } else {
            $.getJSON(this.edgeUrl, function (edges) {
                var previewEdges = this.previewEdges = {};
                // 这里必须要去重，否则边界计算错误
                // 而且需要注意的是， 缩放过的线段可能会产生锯齿.
                // 比如一种典型的情况是： top上， 有两个点x一样， y相邻,
                // 这样会给判断点是否在边界上带来麻烦
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
                d.resolve(this.previewEdges);
            }.bind(this));
        }
        return d; 
    }

    DesignRegion.prototype.previewTop = function () {
    }

    DesignRegion.prototype.previewBottom = function () {
    }

    DesignRegion.prototype.previewLeft = function () {
    }

    DesignRegion.prototype.previewRight = function () {
    }


    DesignRegion.prototype.previewWidth = function () {
        return this.previewRight() - this.previewLeft(); 
    }

    DesignRegion.prototype.previewHeight = function () {
        return this.previewTop() - this.previewBottom();
    }

    DesignRegion.prototype.bounds = function () {
        if (this._bounds) {
            return this._bounds;
        }

        if (!this.previewEdges) {
            throw 'please call DesignRegion.getPreviewEdges at first!'
        }
        
        // 注意, 投射区域中, 不是说top边上的任何一个点都在left的右边, 也不是
        // 都在bottom的上面. 这里唯一要求的是, 这四个边组成了一个封闭区域.
        // 那么我们就要将四个边放在一起考虑, 给定任何一个y, 左右边界是什么,
        // 给定任何一个x, 上下边界是什么
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
    }

    DesignRegion.prototype.getBlackShadow = function (width, height) {
        var d = $.Deferred();
        if (this.blackShadowImageData) {
            d.resolve(this.blackShadowImageData);  
            return d;
        }

        if ($.support.cors || this.blackShadowUrl.indexOf("http") !== 0) {
            var blackImageObj = new Image();
            blackImageObj.crossOrigin = "Anonymous";
            blackImageObj.onload = function () {
                this.blackShadowImageData = readImageData(blackImageObj, width, height);
                d.resolve('black');
            }.bind(this);
            $.ajax({url: this.blackShadowUrl, crossDomain: true}).done(
                function () {
                    blackImageObj.src = this.blackShadowUrl;
                }.bind(this));
        } else {
            $.getImageData({url: this.blackShadowUrl,
                crossDomain: true,
                success: function (blackImageObj) {
                    this.blackShadowImageData = readImageData(blackImageObj, width, height);
                    d.resolve('black');
                }.bind(this),
                error: function (xhr, status) {
                    alert("load image error");
                }
            })
        }

        return d;
    }

    DesignRegion.prototype.getWhiteShadow = function (width, height) {
        var d = $.Deferred();
        if (this.whiteShadowImageData) {
            d.resolve(this.whiteShadowImageData);  
            return d;
        }

        if ($.support.cors || this.whiteShadowUrl.indexOf("http") !== 0) {
            var whiteImageObj = new Image();
            whiteImageObj.crossOrigin = "Anonymous";
            whiteImageObj.onload = function () {
                this.whiteShadowImageData = readImageData(whiteImageObj, width, height);
                d.resolve('white');
            }.bind(this);
            $.ajax({url: this.whiteShadowUrl, crossDomain: true}).done(
                function () {
                    whiteImageObj.src = this.whiteShadowUrl;
                }.bind(this));
        } else {
            $.getImageData({url: this.whiteShadowUrl,
                crossDomain: true,
                success: function (whiteImageObj) {
                    this.whiteShadowImageData = readImageData(whiteImageObj, width, height);
                    d.resolve('white');
                }.bind(this),
                error: function (xhr, status) {
                    alert("load image error");
                }
            })
        }

        return d;
    }

    DesignRegion.prototype.clearLayers = function () {
        this.previewLayer.remove();
    }

    return DesignRegion;
});
