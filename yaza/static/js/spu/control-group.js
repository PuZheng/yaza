define(function () {
    function makeControlGroup(node, title) {
        var group = new Kinetic.Group({
            x: node.x() - node.offsetX() + node.width() / 2,
            y: node.y() - node.offsetY() + node.height() / 2,
            draggable: true,
            name: title,
        });
        group.on('dragstart', function() {
            this.moveToTop();
        });
        group.on('dragend', function (playGround) {
            return function() {
                node.position({
                    x: group.x(),
                    y: group.y(),
                });
            }
        }(this));
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
        _addRotationHandleBar(group, 0,
                -(node.height() / 2 + 50), 'handleBar', node);

        return group;
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
        anchor.on('dragmove', function (playGround) {
            return function() {
                var dx = this.x();
                var dy = this.y();
                var line = group.find('.handle-bar-line');
                line.points([0, -Math.sqrt(dx * dx + dy * dy), 0, 0]);
                var degree = Math.atan2(dx, -dy) * 180 / Math.PI;
                group.rotate(degree);
                this.rotate(-degree);
                node.rotate(degree);
                node.getLayer().draw();
            };
        }(this));

        anchor.on('dragend', function (playGround) {
            return function () {
                group.setDraggable(true);
            };
        }(this));

        group.add(anchor);
    }
    
    return makeControlGroup;
});
