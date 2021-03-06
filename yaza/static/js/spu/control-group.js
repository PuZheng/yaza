define(["spu/config", "kineticjs"], function (config, Kinetic) {

    'use strict';

    function info(group) {
        var rect = group.find('.rect')[0];
        return "x: " + group.x() + '; y: ' + group.y() + '; rotation: ' + group.rotation() + "; width: " + rect.width() + "; height: " + rect.height();
    }

    function makeControlGroup(node, title, resizable, hoveredComplementaryColor) {
        resizable = !!resizable;

        var containerGroup = new Kinetic.Group({
            name: title,
            target: node
        });
        containerGroup.hide = function () {
            group.hide();
        };
        containerGroup.show = function () {
            group.show();
        };
        containerGroup.draggable = function (arg) {
            group.draggable(arg);
        };
        containerGroup.position = function (arg) {
            if (!!arg) {
                return group.position(arg);
            }
            return group.position();
        };
        containerGroup.x = function (arg) {
            if (!!arg) {
                return group.x(arg);
            }
            return group.x();
        };
        containerGroup.y = function (arg) {
            if (!!arg) {
                return group.y(arg);
            }
            return group.y();
        };
        containerGroup.activated = function (arg) {
            if (arg != undefined) {
                this._activated = arg;
            } else {
                return !!this._activated; 
            }
        };

        var fakeImage = new Kinetic.Rect({
            x: node.x() + node.width() / 2 - node.offsetX(),
            y: node.y() + node.height() / 2 - node.offsetY(),
            width: node.width(),
            height: node.height(),
            name: 'fake-image',
            offset: {
                x: node.width() / 2,
                y: node.height() / 2,
            }
        });
        fakeImage.on('mouseenter', function () {
            if (!containerGroup.activated() && !group.visible() && containerGroup.getAttr('target').visible()) {
                group.show();
                rect.stroke(hoveredComplementaryColor);
                group.getLayer().draw();
            }
        });
        containerGroup.add(fakeImage);
        var group = new Kinetic.Group({
            x: node.x() + node.width() / 2 - node.offsetX(),
            y: node.y() + node.height() / 2 - node.offsetY(),
            draggable: true,
            name: 'control',
            fakeImage: fakeImage,
        });
        containerGroup.add(group);
        // 当进入图像, 临时展示control group
        group.on('dragstart', function () {
            this.moveToTop();
            node.draw();
        });
        group.on('dragend', function () {
            node.position({
                x: this.x(),
                y: this.y(),
            });
            fakeImage.position(this.position());
        });
        var rect = new Kinetic.Rect({
            x: -node.width() / 2,
            y: -node.height() / 2,
            strokeWidth: 1,
            width: node.width(),
            height: node.height(),
            dash: [5, 5],
            name: 'rect'
        });
        rect.on("mouseover", function () {
            document.body.style.cursor = 'move';
            this.getLayer().draw();
        })
        rect.on("mouseout", function () {
            document.body.style.cursor = 'default';
            // 如果是临时控制组, 离开rect要隐藏
            if (!containerGroup.activated()) {
                group.hide();
            }
            this.getLayer().draw();
        });

        group.add(rect);
        var line = new Kinetic.Line({
            stroke: 'gray',
            strokeWidth: 1,
            points: [0, -(node.height() / 2 + 50), 0, 0],
            dash: [5, 5],
            name: 'handle-bar-line'
        });
        group.add(line);
        var circle = new Kinetic.Circle({
            x: 0,
            y: 0,
            fill: 'red',
            radius: 3,
            name: 'center'
        });
        group.add(circle);
        if (resizable) {
            _addAnchor(group, -node.width() / 2, -node.height() / 2, 'topLeft', node, "nw-resize", function (pos) {
                if (Math.tan(group.rotation() / 180 * Math.PI) > 0) {
                    var angle = Math.PI / 2 - group.rotation() / 180 * Math.PI - Math.atan(node.height() / node.width());
                    var offsetY = pos.y - group.y();
                    return {x: group.x() + offsetY * Math.tan(angle), y: pos.y};
                } else {
                    var angle = Math.PI / 2 - group.rotation() / 180 * Math.PI - Math.atan(node.height() / node.width());
                    var offsetX = pos.x - group.x();
                    console.log({x: pos.x, y: group.y() + offsetX / Math.tan(angle)});
                    return {x: pos.x, y: group.y() + offsetX / Math.tan(angle)};
                }
            });
            _addAnchor(group, node.width() / 2, -node.height() / 2, 'topRight', node, "ne-resize", function (pos) {
                if (Math.tan(group.rotation() / 180 * Math.PI) > 0) {
                    var offsetX = pos.x - group.x();
                    var angle = Math.atan(node.height() / node.width()) - group.rotation() / 180 * Math.PI;
                    return {
                        x: pos.x, 
                        y: group.y() - offsetX * Math.tan(angle)
                    };
                } else {
                    var angle = Math.atan(node.height() / node.width()) - group.rotation() / 180 * Math.PI;
                    var offsetY = pos.y - group.y();
                    return {
                        x: group.x() - offsetY / Math.tan(angle), 
                        y: pos.y
                    };
                }
            });
            _addAnchor(group, node.width() / 2, node.height() / 2, 'bottomRight', node, "nw-resize", function (pos) {
                if (Math.tan(group.rotation() / 180 * Math.PI) > 0) {
                    var angle = Math.PI / 2 - group.rotation() / 180 * Math.PI - Math.atan(node.height() / node.width());
                    var offsetY = pos.y - group.y();
                    return {x: group.x() + offsetY * Math.tan(angle), y: pos.y};
                } else {
                    var angle = Math.PI / 2 - group.rotation() / 180 * Math.PI - Math.atan(node.height() / node.width());
                    var offsetX = pos.x - group.x();
                    return {x: pos.x, y: group.y() + offsetX / Math.tan(angle)};
                }
            });
            _addAnchor(group, -node.width() / 2, node.height() / 2, 'bottomLeft', node, "ne-resize", function (pos) {
                if (Math.tan(group.rotation() / 180 * Math.PI) > 0) {
                    var offsetX = pos.x - group.x();
                    var angle = Math.atan(node.height() / node.width()) - group.rotation() / 180 * Math.PI;
                    return {
                        x: pos.x, 
                        y: group.y() - offsetX * Math.tan(angle)
                    };
                } else {
                    var angle = Math.atan(node.height() / node.width()) - group.rotation() / 180 * Math.PI;
                    var offsetY = pos.y - group.y();
                    return {
                        x: group.x() - offsetY / Math.tan(angle), 
                        y: pos.y
                    };
                }
            });

            if (config.DISPROPORTIONATE) {
                _addEdgeAnchor(group, 0, -node.height() / 2, 'top', node,
                    "s-resize", function (pos) {
                        // pos是绝对位置(即相对于canvas)
                        var offsetX = (pos.x - group.x());
                        var offsetY = (pos.y - group.y());
                        var distance = Math.sqrt(offsetY * offsetY + offsetX * offsetX);
                        // 计算在group坐标系下(即以group.position()为原点, 并考虑旋转)的新的Y 坐标, 并沿着同一条边的y
                        var offsetY_ = (offsetY > 0 ? 1 : -1) * distance * Math.cos(group.rotation() / 180 * Math.PI + Math.atan(offsetX / offsetY));
                        if (offsetY_ > 0) {
                            offsetY_ = 0;
                        }
                        // 注意, x必须沿着0
                        // 再次转化回屏幕坐标系
                        return {
                            x: group.x() + (offsetY_ * Math.sin(group.rotation() / 180 * Math.PI + Math.PI)),
                            y: group.y() + (offsetY_ * Math.cos(group.rotation() / 180 * Math.PI)),
                        }
                    });
                _addEdgeAnchor(group, -node.width() / 2, 0,
                    'left', node, "w-resize", function (pos) {
                        // pos是绝对位置(即相对于canvas)
                        var offsetX = (pos.x - group.x());
                        var offsetY = (pos.y - group.y());
                        var distance = Math.sqrt(offsetY * offsetY + offsetX * offsetX);
                        // 计算在group坐标系下(即以group.position()为原点, 并考虑旋转)的新的X坐标, 并沿着同一条边的x
                        var offsetX_ = (offsetX > 0 ? 1 : -1) * distance * Math.cos(group.rotation() / 180 * Math.PI - Math.atan(offsetY / offsetX));
                        if (offsetX_ > 0) {
                            offsetX_ = 0;
                        }
                        // 注意, y必须沿着0
                        // 再次转化回屏幕坐标系
                        return {
                            x: group.x() + (offsetX_ * Math.cos(group.rotation() / 180 * Math.PI)),
                            y: group.y() + (offsetX_ * Math.sin(group.rotation() / 180 * Math.PI)),
                        }
                    });

                _addEdgeAnchor(group, 0, node.height() / 2, 'bottom', node, "s-resize",
                    function (pos) {
                        // pos是绝对位置(即相对于canvas)
                        var offsetX = (pos.x - group.x());
                        var offsetY = (pos.y - group.y());
                        var distance = Math.sqrt(offsetY * offsetY + offsetX * offsetX);
                        // 计算在group坐标系下(即以group.position()为原点, 并考虑旋转)的新的Y坐标, 并沿着同一条边的y
                        var offsetY_ = (offsetY > 0 ? 1 : -1) * distance * Math.cos(group.rotation() / 180 * Math.PI + Math.atan(offsetX / offsetY));
                        if (offsetY_ < 0) {
                            offsetY_ = 0;
                        }
                        // 注意, x必须沿着0
                        // 再次转化回屏幕坐标系
                        return {
                            x: group.x() + (offsetY_ * Math.sin(group.rotation() / 180 * Math.PI + Math.PI)),
                            y: group.y() + (offsetY_ * Math.cos(group.rotation() / 180 * Math.PI)),
                        }
                    });
                _addEdgeAnchor(group, node.width() / 2, 0, 'right', node, "w-resize",
                    function (pos) {
                        // pos是绝对位置(即相对于canvas)
                        var offsetX = (pos.x - group.x());
                        var offsetY = (pos.y - group.y());
                        var distance = Math.sqrt(offsetY * offsetY + offsetX * offsetX);
                        // 计算在group坐标系下(即以group.position()为原点, 并考虑旋转)的新的X坐标, 并沿着同一条边的x
                        var offsetX_ = (offsetX > 0 ? 1 : -1) * distance * Math.cos(-group.rotation() / 180 * Math.PI + Math.atan(offsetY / offsetX));
                        if (offsetX_ < 0) {
                            offsetX_ = 0;
                        }
                        // 注意, y必须沿着0
                        // 再次转化回屏幕坐标系
                        return {
                            x: group.x() + (offsetX_ * Math.cos(group.rotation() / 180 * Math.PI)),
                            y: group.y() + (offsetX_ * Math.sin(group.rotation() / 180 * Math.PI)),
                        }
                    });
            }
        }
        _addRotationHandleBar(group, 0,
            -(node.height() / 2 + 50), 'handleBar', node);

        containerGroup.snap = function (x, y, snapTolerance) {
            var group = this.find('.control')[0];
            var centerX = group.x();
            var centerY = group.y();

            var cXs = Math.abs(centerX - x) <= snapTolerance;
            var cYs = Math.abs(centerY - y) <= snapTolerance;

            if (cXs) {
                group.x(x);
            }
            if (cYs) {
                group.y(y);
            }

        };

        return containerGroup;
    }

    function _addAnchor(group, x, y, name, node, cursorStyle, dragBoundFunc) {

        var anchor = new Kinetic.Circle({
            x: x,
            y: y,
            stroke: '#666',
            fill: '#ddd',
            strokeWidth: 2,
            radius: 7,
            name: name,
            draggable: true,
            dragOnTop: false,
            dragBoundFunc: function (pos) {
                // pos本来是基于整个stage的坐标系， 首先要转成在control layer
                // 坐标系下， 然后再转回来
                var layer = group.getLayer();
                var ret = dragBoundFunc({
                    x: pos.x - layer.x(),
                    y: pos.y - layer.y(),
                });
                return {
                    x: ret.x + layer.x(),
                    y: ret.y + layer.y(),
                };
            }
        });
        anchor.on('mouseover', function () {
            var layer = this.getLayer();
            document.body.style.cursor = cursorStyle;
            this.strokeWidth(4);
            layer.draw();
        });
        anchor.on('mouseout', function () {
            var layer = this.getLayer();
            document.body.style.cursor = 'default';
            this.strokeWidth(2);
            layer.draw();
        });
        anchor.on('mousedown touchstart', function () {
            group.setDraggable(false);
            this.moveToTop();
        });

        var stage = group.getStage();
        var layer = group.getLayer();
        anchor.on('dragmove', function () {
            _updateControlGroup(this, node);
        });

        anchor.on('dragend', function () {
            // 重新计算group的位置, 以保证始终能按照物理中心进行旋转
            var rect = group.find('.rect')[0];
            var offsetX = rect.x() + rect.width() / 2;
            var offsetY = rect.y() + rect.height() / 2;

            if (offsetX * offsetY > 0) {
                var angle = node.rotation() / 180 * Math.PI + Math.atan(rect.height() / rect.width()) + ((offsetX > 0)? 0: Math.PI); 
            } else if (offsetX * offsetY < 0) {
                var angle = node.rotation() / 180 * Math.PI - Math.atan(rect.height() / rect.width()) + ((offsetX > 0)? 0: Math.PI); 
            } else if (offsetX == 0) {
                var angle = -Math.PI / 2 + node.rotation() / 180 * Math.PI + (offsetY < 0? 0: Math.PI);
            } else {
                var angle = node.rotation() / 180 * Math.PI + (offsetX > 0? 0: Math.PI);
            }

            var d = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

            group.move({
                x: d * Math.cos(angle),
                y: d * Math.sin(angle),
            });
            group.getChildren().each(function (node) {
                node.move({
                    x: -offsetX,
                    y: -offsetY
                });
            });
            group.getAttr('fakeImage').position(group.position())
            .size(rect.size()).offset({
                x: rect.width() / 2,
                y: rect.height() / 2,
            });
            group.getLayer().draw();
            group.setDraggable(true);
        });

        group.add(anchor);
    }

    function _addEdgeAnchor(group, x, y, name, node, cursorStyle, dragBoundFunc) {
        var rect = new Kinetic.Rect({
            x: x,
            y: y,
            name: name,
            width: 8,
            height: 8,
            stroke: '#666',
            fill: '#ddd',
            strokeWidth: 2,
            radius: 7,
            draggable: true,
            dragOnTop: false,
            dragBoundFunc: function (pos) {
                // pos本来是基于整个stage的坐标系， 首先要转成在control layer
                // 坐标系下， 然后再转回来
                var layer = group.getLayer();
                var ret = dragBoundFunc({
                    x: pos.x - layer.x(),
                    y: pos.y - layer.y(),
                });
                return {
                    x: ret.x + layer.x(),
                    y: ret.y + layer.y(),
                };
            },
            offset: {
                x: 4,
                y: 4,
            }
        });
        rect.on("mouseover", function () {
            document.body.style.cursor = cursorStyle;
            this.strokeWidth(4);
            this.getLayer().draw();
        }).on("mouseout", function () {
            document.body.style.cursor = "default";
            this.strokeWidth(2);
            this.getLayer().draw();
        }).on('mousedown touchstart', function () {
            group.setDraggable(false);
            this.moveToTop();
        }).on('dragmove', function () {
            _updateControlGroup(this, node);
        }).on('dragend', function () {
            var rect = group.find('.rect')[0];
            var offsetX = rect.x() + rect.width() / 2;
            var offsetY = rect.y() + rect.height() / 2;

            if (offsetX * offsetY > 0) {
                var angle = node.rotation() / 180 * Math.PI + Math.atan(rect.height() / rect.width()) + ((offsetX > 0)? 0: Math.PI); 
            } else if (offsetX * offsetY < 0) {
                var angle = node.rotation() / 180 * Math.PI - Math.atan(rect.height() / rect.width()) + ((offsetX > 0)? 0: Math.PI); 
            } else if (offsetX == 0) {
                var angle = -Math.PI / 2 + node.rotation() / 180 * Math.PI + (offsetY < 0? 0: Math.PI);
            } else {
                var angle = node.rotation() / 180 * Math.PI + (offsetX > 0? 0: Math.PI);
            }

            var d = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

            group.move({
                x: d * Math.cos(angle),
                y: d * Math.sin(angle),
            });
            group.getChildren().each(function (node) {
                node.move({
                    x: -offsetX,
                    y: -offsetY
                });
            });
            group.getAttr('fakeImage').position(group.position())
            .size(rect.size()).offset({
                x: rect.width() / 2,
                y: rect.height() / 2,
            });
            group.getLayer().draw();
            group.setDraggable(true);
        });
        group.add(rect);
        return rect;
    }

    function _addRotationHandleBar(group, x, y, name, node) {
        var anchor = new Kinetic.Circle({
            x: x,
            y: y,
            stroke: '#666',
            fill: 'yellow',
            strokeWidth: 2,
            radius: 6,
            name: name,
            draggable: true
        });
        anchor.on('mouseover', function () {
            var layer = this.getLayer();
            document.body.style.cursor = 'pointer';
            this.strokeWidth(4);
            layer.draw();
        });
        anchor.on('mouseout', function () {
            var layer = this.getLayer();
            document.body.style.cursor = 'default';
            this.strokeWidth(2);
            layer.draw();
        });
        anchor.on('mousedown touchstart', function () {
            group.setDraggable(false);
            this.moveToTop();
        });

        anchor.on('dragmove', function () {
            var dx = this.x();
            var dy = this.y();
            var line = group.find('.handle-bar-line');
            line.points([0, -Math.sqrt(dx * dx + dy * dy), 0, 0]);
            var degree = Math.atan2(dx, -dy) * 180 / Math.PI;
            group.rotate(degree);
            group.getAttr('fakeImage').rotate(degree);
            this.rotate(-degree);
            node.rotate(degree);

            node.getLayer().draw();
        });

        anchor.on('dragend', function () {
            group.setDraggable(true);
        });

        group.add(anchor);
    }

    function _updateControlGroup(anchor, node) {
        // 这里调整group中所有元素的位置, 而不是直接移动group,
        // 原因是, 如果移动group, 本anchor就得移动回来,这个时候和
        // 鼠标就脱节了
        var group = anchor.getParent();

        var topLeft = group.find('.topLeft')[0];
        var topRight = group.find('.topRight')[0];
        var bottomRight = group.find('.bottomRight')[0];
        var bottomLeft = group.find('.bottomLeft')[0];

        // if not config.DISPROPORTIONATE, top returns undefined
        var top = group.find(".top")[0];
        var right = group.find(".right")[0];
        var bottom = group.find(".bottom")[0];
        var left = group.find(".left")[0];

        var anchorX = anchor.x();
        var anchorY = anchor.y();


        var rect = group.find('.rect')[0];
        var oldWidth = rect.width();
        var oldHeight = rect.height();

        // if not config.DISPROPORTIONATE, anchor.name can't be top, right, bottom, left
        switch (anchor.name()) {
            case 'topLeft':
                rect.position({
                    x: anchorX,
                    y: anchorY
                });
                topRight.y(anchorY);
                bottomLeft.x(anchorX);

                if (config.DISPROPORTIONATE) {
                    top.x((topLeft.x() + topRight.x()) / 2);
                    top.y(topLeft.y());
                    bottom.x((bottomLeft.x() + bottomRight.x()) / 2);
                    left.x(topLeft.x());
                    left.y((topLeft.y() + bottomLeft.y()) / 2);
                    right.y(left.y());
                }

                var newWidth = topRight.x() - topLeft.x();
                var newHeight = bottomLeft.y() - topLeft.y();
                var offsetX = (oldWidth - newWidth) / 2;
                var offsetY = (oldHeight - newHeight) / 2;
                var angle = node.rotation() / 180 * Math.PI + Math.atan(newHeight / newWidth) + ((offsetX > 0)? 0: Math.PI); 

                break;
            case 'topRight':
                rect.y(anchorY);
                topLeft.y(anchorY);
                bottomRight.x(anchorX);

                if (config.DISPROPORTIONATE) {
                    top.x((topLeft.x() + topRight.x()) / 2);
                    top.y(topLeft.y());
                    bottom.x((bottomLeft.x() + bottomRight.x()) / 2);
                    left.y((topRight.y() + bottomRight.y()) / 2);
                    right.y(left.y());
                    right.x(topRight.x());
                }

                newWidth = topRight.x() - topLeft.x();
                newHeight = bottomLeft.y() - topLeft.y();
                offsetX = -(oldWidth - newWidth) / 2;
                offsetY = (oldHeight - newHeight) / 2;
                var angle = node.rotation() / 180 * Math.PI - Math.atan(newHeight / newWidth) + ((offsetX > 0)? 0: Math.PI); 
                break;
            case 'bottomRight':
                topRight.x(anchorX);
                bottomLeft.y(anchorY);

                if (config.DISPROPORTIONATE) {
                    top.x((topLeft.x() + topRight.x()) / 2);
                    bottom.x((bottomLeft.x() + bottomRight.x()) / 2);
                    bottom.y(bottomRight.y());
                    right.x(bottomRight.x());
                    right.y((topRight.y() + bottomRight.y()) / 2);
                    left.y(right.y());
                }

                newWidth = topRight.x() - topLeft.x();
                newHeight = bottomLeft.y() - topLeft.y();
                offsetX = -(oldWidth - newWidth) / 2;
                offsetY = -(oldHeight - newHeight) / 2;
                var angle = node.rotation() / 180 * Math.PI + Math.atan(newHeight / newWidth) + ((offsetX > 0)? 0: Math.PI); 
                break;
            case 'bottomLeft':
                rect.x(anchorX);
                topLeft.x(anchorX);
                bottomRight.y(anchorY);

                if (config.DISPROPORTIONATE) {
                    top.x((topLeft.x() + topRight.x()) / 2);
                    bottom.x((bottomLeft.x() + bottomRight.x()) / 2);
                    bottom.y(bottomRight.y());
                    left.x(bottomLeft.x());
                    left.y((topRight.y() + bottomRight.y()) / 2);
                    right.y(left.y());
                }

                newWidth = topRight.x() - topLeft.x();
                newHeight = bottomLeft.y() - topLeft.y();
                offsetX = (oldWidth - newWidth) / 2;
                offsetY = -(oldHeight - newHeight) / 2;
                var angle = node.rotation() / 180 * Math.PI - Math.atan(newHeight / newWidth) + ((offsetX > 0)? 0: Math.PI); 
                break;
            case 'right':
                topRight.x(right.x());
                bottomRight.x(right.x());
                top.x((topLeft.x() + topRight.x()) / 2);
                bottom.x((bottomLeft.x() + bottomRight.x()) / 2);

                newWidth = right.x() - left.x();
                newHeight = oldHeight;

                offsetX = (newWidth - oldWidth) / 2;
                offsetY = 0;
                var angle = node.rotation() / 180 * Math.PI + (offsetX > 0? 0: Math.PI);
                break;
            case 'left':
                topLeft.x(left.x());
                bottomLeft.x(topLeft.x());
                top.x((topLeft.x() + topRight.x()) / 2);
                bottom.x((bottomLeft.x() + bottomRight.x()) / 2);

                rect.x(topLeft.x());

                newWidth = right.x() - left.x();
                newHeight = oldHeight;

                offsetX = (oldWidth - newWidth) / 2;
                offsetY = 0;
                var angle = node.rotation() / 180 * Math.PI + (offsetX > 0? 0: Math.PI);
                break;
            case 'top':
                topLeft.y(top.y());
                topRight.y(topLeft.y());

                left.y((topLeft.y() + bottomLeft.y()) / 2);
                right.y((topRight.y() + bottomRight.y()) / 2);

                rect.y(topLeft.y());

                newWidth = oldWidth;
                newHeight = bottom.y() - top.y();

                offsetX = 0;
                offsetY = (oldHeight - newHeight) / 2;

                var angle = -Math.PI / 2 + node.rotation() / 180 * Math.PI + (offsetY < 0? 0: Math.PI);
                break;
            case 'bottom':
                bottomLeft.y(bottom.y());
                bottomRight.y(bottomLeft.y());

                left.y((topLeft.y() + bottomLeft.y()) / 2);
                right.y((topRight.y() + bottomRight.y()) / 2);

                newWidth = oldWidth;
                newHeight = bottom.y() - top.y();

                offsetX = 0;
                offsetY = (newHeight - oldHeight ) / 2;
                var angle = -Math.PI / 2 + node.rotation() / 180 * Math.PI + (offsetY < 0? 0: Math.PI);

                break;
        }

        rect.width(newWidth).height(newHeight);
        // 注意, 移动node, x, y设定在了物理中心
        var d = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        node.size(rect.size()).move({
            x: d * Math.cos(angle),
            y: d * Math.sin(angle),
        }).offset({
            x: newWidth / 2,
            y: newHeight / 2
        });
        ['.handleBar', '.handle-bar-line', '.center'].forEach(function (nodeName) {
            group.find(nodeName)[0].move({
                x: offsetX,
                y: offsetY
            });
        });
        group.getLayer().draw();
        node.getLayer().draw();
    }

    return makeControlGroup;
});
