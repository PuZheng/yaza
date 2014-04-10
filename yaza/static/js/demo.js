$(function () {


    function update(activeAnchor) {
        var group = activeAnchor.getParent();

        var topLeft = group.find('.topLeft')[0];
        var topRight = group.find('.topRight')[0];
        var bottomRight = group.find('.bottomRight')[0];
        var bottomLeft = group.find('.bottomLeft')[0];
        var image = group.find('.image')[0];

        var anchorX = activeAnchor.x();
        var anchorY = activeAnchor.y();

        // update anchor positions
        switch (activeAnchor.name()) {
            case 'topLeft':
                topRight.y(anchorY);
                bottomLeft.x(anchorX);
                break;
            case 'topRight':
                topLeft.y(anchorY);
                bottomRight.x(anchorX);
                break;
            case 'bottomRight':
                bottomLeft.y(anchorY);
                topRight.x(anchorX); 
                break;
            case 'bottomLeft':
                bottomRight.y(anchorY);
                topLeft.x(anchorX); 
                break;
        }

        image.setPosition(topLeft.getPosition());

        var width = topRight.x() - topLeft.x();
        var height = bottomLeft.y() - topLeft.y();
        if(width && height) {
            image.setSize({width:width, height: height});
        }
    }

    function addAnchor(group, x, y, name) {
        var stage = group.getStage();
        var layer = group.getLayer();

        var anchor = new Kinetic.Circle({
            x: x,
            y: y,
            stroke: '#666',
            fill: '#ddd',
            strokeWidth: 2,
            radius: 8,
            name: name,
            draggable: true,
            dragOnTop: false
        });

        anchor.on('dragmove', function() {
            update(this);
            layer.draw();
        });
        anchor.on('mousedown touchstart', function() {
            group.setDraggable(false);
            this.moveToTop();
        });
        anchor.on('dragend', function() {
            group.setDraggable(true);
            layer.draw();
            drawHotspot();         
        });
        // add hover styling
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

        group.add(anchor);
    }

    var stagePlayGround = new Kinetic.Stage({
        container: $('.playground')[0],
        width: 400,
        height: 300,
    });
    var playGroundLayer = null;
    var imageObj = new Image();
    imageObj.onload = function () {
        var group = new Kinetic.Group({
            x: 50,
            y: 50,
            draggable: true
        });
        var image = new Kinetic.Image({
            x: 0,
            y: 0,
            image: imageObj,
            width: 275,
            height: 184,
            name: 'image'
        });
        group.add(image);
        group.on('dragstart', function() {
            this.moveToTop();
        });
        group.on('dragend', function() {
            this.moveToTop();
            drawHotspot();         
        });
        playGroundLayer = new Kinetic.Layer();
        playGroundLayer.add(group);
        stagePlayGround.add(playGroundLayer);
        addAnchor(group, 0, 0, 'topLeft');
        addAnchor(group, 275, 0, 'topRight');
        addAnchor(group, 275, 184, 'bottomRight');
        addAnchor(group, 0, 184, 'bottomLeft');
        drawHotspot();         
    }
    imageObj.src = '/static/assets/sample.jpg';

    var stageHotspot = new Kinetic.Stage({
        container: $('.hotspot')[0],
        width: 400,
        height: 300,
    }); 
    var layer = new Kinetic.Layer();
    stageHotspot.add(layer);
    var hotspotContext = layer.getContext();
    var hotspotImageData = hotspotContext.createImageData(400, 300);

    var edgeSet = new buckets.Set();
    edges['left'].forEach(function (p) {
        edgeSet.add(p);
    });
    edges['right'].forEach(function (p) {
        edgeSet.add(p);
    });
    edges['top'].forEach(function (p) {
        edgeSet.add(p);
    });
    edges['bottom'].forEach(function (p) {
        edgeSet.add(p);
    });

    function drawHotspot() {
        var width = 400;
        var height = 300;
        var srcImageData = playGroundLayer.getContext().getImageData(0, 0, 400, 300).data;
        for (var i = 0; i < width; ++i) {
            var met_edge = 0;
            for (var j = 0; j < height; ++j) {
                if (edgeSet.contains([i, j])) {
                    met_edge += 1;
                    var pos = (i + j * width) * 4;
                    hotspotImageData.data[pos] = 255;
                    hotspotImageData.data[pos + 1] = 0;
                    hotspotImageData.data[pos + 2] = 0;
                    hotspotImageData.data[pos + 3] = 255;
                } else {
                    if (met_edge == 1) {
                        origPoint = mvc([i, j], control_points_pairs);
                        var pos = (i + j * width) * 4;
                        var origPos = (origPoint[0] + (origPoint[1] * width))* 4;
                        hotspotImageData.data[pos] = srcImageData[origPos];
                        hotspotImageData.data[pos + 1] = srcImageData[origPos + 1];
                        hotspotImageData.data[pos + 2] = srcImageData[origPos + 2];
                        hotspotImageData.data[pos + 3] = srcImageData[origPos + 3];
                    } else if (met_edge == 2) {
                        break; 
                    }
                }
            }
        }
        hotspotContext.putImageData(hotspotImageData, 0, 0);
    }

    function get_cos(p, p1, p2) {
        var a = Math.pow(p1[0] - p[0], 2) + Math.pow(p1[1] - p[1], 2);
        var b = Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2);
        var c = Math.pow(p2[0] - p[0], 2) + Math.pow(p2[1] - p[1], 2);
        return (a + c - b) / (2 * Math.sqrt(a) * Math.sqrt(c));
    }

    function mvc(point, cp_pairs) {
        var cp_pairs_len = cp_pairs.length;

        var weights = [];
        var cp0, cp1, cp2, cos0, cos1, tan0, tan1, w;
        for (var i = 0; i < cp_pairs_len; ++i) {
            cp0 = cp_pairs[(i-1 + cp_pairs_len) % cp_pairs_len][0];
            cp1 = cp_pairs[i][0];
            cp2 = cp_pairs[(i+1) % cp_pairs_len][0];

            cos0 = get_cos(point, cp0, cp1);
            cos1 = get_cos(point, cp1, cp2);
            if (cos1 <= -1 || cos0 <= -1) {
                weights.push(0);
                continue;
            }
            tan0 = Math.sqrt(Math.max(0, 1.0 - cos0) / (1 + cos0));
            tan1 = Math.sqrt(Math.max(0, 1.0 - cos1) / (1 + cos1));
            w = (tan0 + tan1) / Math.sqrt(Math.pow(cp1[0] - point[0], 2) + Math.pow(cp1[1] - point[1], 2));
            if (isNaN(w)) {
                debugger;
            }
            weights.push(w);
        }

        var x = 0.0;
        var y = 0.0;
        var weights_sum = weights.reduce(function (a, b) { return a + b;}, 0);
        for (var i = 0; i < cp_pairs_len; ++i) {
            x += weights[i] * cp_pairs[i][1][0];
            y += weights[i] * cp_pairs[i][1][1];
        }
        return [Math.round(x / weights_sum), Math.round(y / weights_sum)];
    }
});
