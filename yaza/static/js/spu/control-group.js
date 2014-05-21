define(function () {
    function makeControlGroup(node, title, uuid, resizable) {
        resizable = !!resizable;
        var group = new Kinetic.Group({
            x: node.x() - node.offsetX() + node.width() / 2,
            y: node.y() - node.offsetY() + node.height() / 2,
            draggable: true,
            name: title,
            uuid: uuid
        });
        group.on('dragstart', function() {
            this.moveToTop();
        });
        group.on('dragend', function() {
            node.position({
                x: group.x(),
                y: group.y(),
            });
        });
        var rect = new Kinetic.Rect({
            x: -node.width() / 2,
            y: -node.height() / 2,
            stroke: 'gray',
            strokeWidth: 1,
            width: node.width(),
            height: node.height(),
            dash: [5, 5],
            name: 'rect',
        });
        rect.on("mouseover",function () {
            document.body.style.cursor = 'move';
            this.getLayer().draw();
        }).on("mouseout", function () {
            document.body.style.cursor = 'default';
            this.getLayer().draw();
        });

        group.add(rect);
        var line = new Kinetic.Line({
            stroke: 'gray',
            strokeWidth: 1,
            points: [0, - (node.height() / 2 + 50), 0, 0],
            dash: [5, 5],
            name: 'handle-bar-line',
        });
        group.add(line);
        var circle = new Kinetic.Circle({
            x: 0,
            y: 0,
            fill: 'red',
            radius: 3,
            name: 'center',
        });
        group.add(circle);
        if (resizable) {
            _addAnchor(group, -node.width() / 2, -node.height() / 2, 'topLeft', node, "nw-resize");
            _addAnchor(group, node.width() / 2, -node.height() / 2, 'topRight', node, "ne-resize");
            _addAnchor(group, node.width() / 2, node.height() / 2, 'bottomRight', node, "nw-resize");
            _addAnchor(group, -node.width() / 2, node.height() / 2, 'bottomLeft', node, "ne-resize");
        }
        _addRotationHandleBar(group, 0,
                -(node.height() / 2 + 50), 'handleBar', node);

        return group;
    }

    function _addAnchor(group, x, y, name, node, cursorStyle) {

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
            group.move({
                x: offsetX,
                y: offsetY,
            });
            group.getChildren().each(function (node) {
                node.move({
                    x: -offsetX,
                    y: -offsetY,
                });
            });
            group.getLayer().draw();
            group.setDraggable(true);
        });

        group.add(anchor);
    };

    function _addRotationHandleBar(group, x, y, name, node) {
        var anchor = new Kinetic.Circle({
            x: x,
            y: y,
            stroke: '#666',
            fill: 'yellow',
            strokeWidth: 2,
            radius: 6,
            name: name,
            draggable: true,
        });
        anchor.on('mouseover', function() {
            var layer = this.getLayer();
            document.body.style.cursor = 'pointer';
            this.setStrokeWidth(4);
            layer.draw();
        });
        anchor.on('mouseout', function() {
            var layer = this.getLayer();
            document.body.style.cursor = 'default';
            this.strokeWidth(2);
            layer.draw();
        });
        anchor.on('mousedown touchstart', function() {
            group.setDraggable(false);
            this.moveToTop();
        });

        anchor.on('dragmove', function() {
            var dx = this.x();
            var dy = this.y();
            var line = group.find('.handle-bar-line');
            line.points([0, -Math.sqrt(dx * dx + dy * dy), 0, 0]);
            var degree = Math.atan2(dx, -dy) * 180 / Math.PI;
            group.rotate(degree);
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

        var anchorX = anchor.x();
        var anchorY = anchor.y();


        var rect = group.find('.rect')[0];
        var oldWidth = rect.width();
        var oldHeight = rect.height();

        switch (anchor.name()) {
            case 'topLeft':
                rect.position({
                    x: anchorX,
                    y: anchorY,
                });
                topRight.y(anchorY);
                bottomLeft.x(anchorX);

                var newWidth = topRight.x() - topLeft.x();
                var newHeight = bottomLeft.y() - topLeft.y();
                var offsetX = (oldWidth - newWidth) / 2;
                var offsetY = (oldHeight - newHeight) / 2;
                break;
            case 'topRight':
                rect.y(anchorY);
                topLeft.y(anchorY);
                bottomRight.x(anchorX);
                var newWidth = topRight.x() - topLeft.x();
                var newHeight = bottomLeft.y() - topLeft.y();
                var offsetX = -(oldWidth - newWidth) / 2;
                var offsetY = (oldHeight - newHeight) / 2;
                break;
            case 'bottomRight':
                topRight.x(anchorX);
                bottomLeft.y(anchorY);
                var newWidth = topRight.x() - topLeft.x();
                var newHeight = bottomLeft.y() - topLeft.y();
                var offsetX = -(oldWidth - newWidth) / 2;
                var offsetY = -(oldHeight - newHeight) / 2;
                break;
            case 'bottomLeft':
                rect.x(anchorX);
                topLeft.x(anchorX);
                bottomRight.y(anchorY);
                var newWidth = topRight.x() - topLeft.x();
                var newHeight = bottomLeft.y() - topLeft.y();
                var offsetX = (oldWidth - newWidth) / 2;
                var offsetY = -(oldHeight - newHeight) / 2;
                break;
        }

        rect.width(newWidth).height(newHeight);
        // 注意, 移动node, x, y设定在了物理中心
        node.size(rect.size()).move({
            x: offsetX,
            y: offsetY,
        }).offset({
            x: newWidth / 2,
        y: newHeight / 2,
        });
        ['.handleBar', '.handle-bar-line', '.center'].forEach(function (nodeName) {
            group.find(nodeName)[0].move({
                x: offsetX,
                y: offsetY,
            });
        });
        group.getLayer().draw();
        node.getLayer().draw();
    } 

    return makeControlGroup;
});
