function Colors(dictonary) {
    function sort(dict){
        var values = $.map(dict, function(value, key){return value});
        return values.sort();
    }
    this.array = sort(dictonary);

    this.get = function (idx, total_size, default_value) {
        idx = Math.round((idx + 1) * this.array.length / (total_size + 1));
        return this.array[idx] ? this.array[idx] : (default_value ? default_value : undefined);
    }
}
COLORS = ["#00008B", "#008B8B", "#B8860B", "#8B008B", "#FF8C00", "#9932CC", 
       "#8B0000", "#E9967A", "#483D8B", "#00CED1", "#9400D3", "#FF1493", "#00BFFF", "#FF0000", "#0000FF", "#BDB76B"];

var WorkFlowRepr = function (canvas, tree, compress_range, width, height) {
    this.canvas = canvas;
    this.tree = tree;
    this.width = width? width: 960;
    this.height = height? height: 640;
    this.compress_range = compress_range;
    $(canvas).prepend('<div style="margin-left: 20px"><input type="checkbox" checked id="display-event-description" />是否展示事件描述</div>');
}


WorkFlowRepr.prototype.margin = 60;
WorkFlowRepr.prototype.lifeCycleLineWidth = 5;

function _getNodeCount(tree) {
    if (!tree) {
        return 0;
    }
    var ret = 1;
    for (group in tree.childrenGroups) {
        for (children in group.items()) {
            ret += _getNodeCount(children);
        }
    }
    return ret;
}

function get_attr(list, attrName, encode) {
    var result = '';
    $.each(list, function (idx, value) {
        temp = value[attrName];
        if (!temp){
            return true;
        }
        result += temp;
        if (idx < list.length - 1) {
            result += ","
        }
    });
    if (result && list.length>1) {
        result = '[' + result + ']';
    }
    return result;
}

function _compose_description(list) {
    var desc_list = [];
    for (var i=0; i < list.length; ++i) {
       if (list[i].description) {
           desc_list.push(list[i].description);
       }
    }
    var result = '';
    if (desc_list.length>1) {
        result = '<ul>';
        for (var i=0; i < desc_list.length; ++i) {
            result += '<li>' + desc_list[i] + '</li>';
        }
        result += '</ul>'
    } else if (desc_list.length == 1) {
        result = desc_list[0];
    }
    return result;
}

_traversTree = function(tree) {
    var ret = [];
    function _doTraverseTree(subTree, list) {
        if (!subTree) {
            return;
        }
        list.push(subTree);
        if (subTree.hasOwnProperty('childrenGroups')) {
            for (var i=0; i < subTree.childrenGroups.length; ++i) {
                var group = subTree.childrenGroups[i];
                for (var j=0; j < group.items.length; ++j) {
                    var children = group.items[j];
                    children.parent_ = subTree;
                    _doTraverseTree(children, list)
                }
            }
        }
    };
    _doTraverseTree(tree, ret);
    return ret;
};

WorkFlowRepr.prototype.getMaxPeriod = function () {
    var nodes = _traversTree(this.tree);
    var max = 0;
    $.each(nodes, function(idx, node){
        max = Math.max(max, new Date(node.events[node.events.length - 1].datetime).getTime() - new Date(node.events[0].datetime).getTime());
    });
    return max
}

$("input[type=checkbox][name=visiable-check]").live("click", function () {
    var node = $(this).attr("data-node");
    if($(this).attr("checked")){
        $("[data-node="+node+"]:not([type=checkbox])").show();
    }else{
        $("[data-node="+node+"]:not([type=checkbox])").hide();
    }
});


WorkFlowRepr.prototype.draw = function () {
    var nodes = _traversTree(this.tree);
    var step_size = (this.height - 2 * this.margin) / nodes.length;
    var drawableWidth = this.width - 2 * this.margin;

    var draw = SVG(this.canvas).size(this.width, this.height);
    // draw the swim lane
    var firstNode = nodes[0];
    var beginTime = new Date(firstNode.events[0].datetime);
    var endTime = new Date("1970-01-01T00:00:00");
    var max = this.getMaxPeriod();
    for (var i=0; i < nodes.length; ++i) {
        var node = nodes[i];
        node.idx = i;
        var x = this.margin;
        var y = this.margin + i * step_size;
        for (var j=x; j < x + drawableWidth; j += 10) {
            draw.line(j, y, j + 5, y).stroke({width: 1, color: 'grey'});
        }
        
        var text = draw.text(node.name).move(x, y-15).font({
            size: 10,
            anchor: 'top',
        }).attr({
            'data-ot': node.description,
            'data-role': 'node-name',
            'data-node': i,
        }).fill({color: 'gray'});
        text.click((function (target) {
            return function () {
                window.open(target); 
            }
        })(node.target));
        var fobj = draw.foreignObject(20, 100).attr({id: 'fobj'+i}).move(x-20, y-15);
        fobj.appendChild("div", {id: "fobj-div" + i, innerHTML: "<input type='checkbox' name='visiable-check' checked data-node='" + i + "'>"});
        var node_begin_time = new Date(node.events[0].datetime);
        var node_end_time = new Date(node.events[node.events.length-1].datetime); 
        if (node_begin_time < beginTime) {
            beginTime = node_begin_time;
        }
        if (node_end_time > endTime) {
            endTime = node_end_time;
        }
    }
    var timespan = endTime.getTime() - beginTime.getTime();


    function _calcEventPos(event_) {
        return drawableWidth * (new Date(event_.datetime).getTime() - beginTime.getTime()) / timespan;
    }

    var lifeCycleLayer = [];

    var eventDiameter = 10;
    var lastDate = '';
    var branches = [];
    for (var i=0; i < nodes.length; ++i) {
        var node = nodes[i], group_size = [];
        var color = COLORS[i % nodes.length];
        for (var j=0; j < node.events.length; ++j) {
            var event_ = node.events[j];
            group_size.push(event_);

            var eventPoint = [this.margin + _calcEventPos(event_), this.margin + i * step_size];
            if (j==0) {
                var start = eventPoint;
            }
            if (j < node.events.length - 1 && new Date(node.events[j + 1].datetime).getTime() - new Date(event_.datetime).getTime() < timespan * this.compress_range / 100) {
                continue;
            } else {
                if (group_size.length > 1) {
                    var avg = (_calcEventPos(group_size[0]) + _calcEventPos(group_size[group_size.length - 1])) / 2
                    eventPoint = [this.margin + avg, this.margin + i * step_size];
                    var eventWidth = Math.max(eventDiameter, (new Date(event_.datetime).getTime() - new Date(group_size[0].datetime).getTime()) * this.width / timespan);
                    var circle = draw.ellipse(eventWidth, eventDiameter).center(eventPoint[0], eventPoint[1])
                } else {
                    circle = draw.circle(eventDiameter).center(eventPoint[0], eventPoint[1])
                }
                circle.fill({color: "green"}).attr(
                        {
                            'data-actor': get_attr(group_size, "actor"),
                            'data-datetime': get_attr(group_size, "datetime"),
                            'data-name': get_attr(group_size, "name"),
                            'data-node': i,
                            'data-placement': 'bottom',
                            'data-trigger': 'hover',
                            'data-ot': _compose_description(group_size)
                        }
                    );
                circle.mouseover((function (eventPoint) {
                return function (event) {
                    this.scale(2, 2).center(eventPoint[0], eventPoint[1]);
                    this.fill({color: 'red'});
                }
            })(eventPoint));
            circle.mouseout((function (eventPoint) {
                return function (event) {
                    this.scale(1, 1).center(eventPoint[0], eventPoint[1]).fill({color: 'green'});
                }
            })(eventPoint))
            var textPoint = [eventPoint[0], eventPoint[1] + 5];
            if (j & 1) {
                textPoint[1] -= 40;
            }
            function pad(n){
                return n<10 ? '0'+n : n
            }
            var dateString ="", name="";
            var d = new Date(group_size[0].datetime);
            if (!(lastDate && lastDate.year == d.getUTCFullYear() && lastDate.month == d.getUTCMonth() && lastDate.day == d.getUTCDate())) {
                dateString += pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' ';
            }
            lastDate = {
                year: d.getUTCFullYear(),
                month: d.getUTCMonth(),
                day: d.getUTCDate()
            };
            dateString += pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
            if (group_size.length > 1){
                var d = new Date(group_size[group_size.length-1].datetime);
                dateString += "~";
                if (!(lastDate && lastDate.year == d.getUTCFullYear() && lastDate.month == d.getUTCMonth() && lastDate.day == d.getUTCDate())) {
                    dateString += pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' ';
                }
                lastDate = {
                    year: d.getUTCFullYear(),
                    month: d.getUTCMonth(),
                    day: d.getUTCDate()
                };
                dateString += pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
            }
            draw.text(get_attr(group_size,"name")+"\n"+dateString).move(textPoint[0], textPoint[1]).font({
                size: 10,
                anchor: 'middle'
            }).attr({
                'data-role': 'event-name',
                'data-node': i
            });
                group_size = [];
            }
        }
        var line = draw.line(start[0], start[1], eventPoint[0], eventPoint[1]).stroke({color: color, width: this.lifeCycleLineWidth}).attr({
            'data-role': 'life-cycle',
            'data-ot': node.description,
            'data-node': i
        });
        line.mouseover((function (line_width) {
            return function (event) {
            this.stroke({width: line_width * 2});
            }
        })(this.lifeCycleLineWidth));
        line.mouseleave((function (line_width) {
            return function (event) {
            this.stroke({width: line_width});
            }
        })(this.lifeCycleLineWidth));
        lifeCycleLayer.push(line); 

        // collect branches
        for (var j=0; j < node.childrenGroups.length; ++j) {
            var group = node.childrenGroups[j];
            for (var k=0; k < group['items'].length; ++k) {
                var childNode = group['items'][k];
                branches.push({
                    datetime: new Date(childNode.events[0].datetime),
                    from: node.idx,
                    to: childNode.idx,
                    color: color,

                });
            }
        }
    }
    // draw branches
    branches.sort(function (a, b) {
        if (a.datetime > b.datetime) {
            return 1;
        } 
        if (a.datetime < b.datetime) {
            return -1;
        }
        return 0;
    });
    var lastBranchDatetime = branches[0].datetime;
    var curvature = 0;
    for (var i=0; i < branches.length; ++i) {
        var branch = branches[i];
        if (branch.datetime.getTime() - lastBranchDatetime.getTime() > (max * this.compress_range / 100)) {
            curvature = 0;
            lastBranchDatetime = branch.datetime; 
        }
        var y1 = this.margin + branch.to * step_size;
        var y2 = this.margin + branch.from * step_size;
        var x1 = x2 = this.margin + drawableWidth * (branch.datetime.getTime() - beginTime.getTime()) / timespan;
        var path = 'M' + x2 + ',' + y2 + ' ';
        path += 'A' + (curvature * 25) + ',' + (y1 - y2)/2 + ' ';
        path += '0 ';
        path += '0,0 ';
        path += x1 + ',' + (y1 - eventDiameter);
        draw.path(path, true).stroke({width: 2, color: branch.color}).fill('none').attr({'marker-end': 'url(#Triangle)', 'data-node': branch.from});
        ++curvature;
    }

    for (var i=0; i < lifeCycleLayer.length; ++i) {
        lifeCycleLayer[i].back();
    }
    $('text[data-role="node-name"], line[data-role="life-cycle"], ellipse').each(function () {
        if ($(this).attr('data-ot')) {
            new Opentip($(this), $(this).attr('data-ot'));
        }
   });
      $("#display-event-description").change(function () {
        if (this.checked)  {
          $('text[data-role="event-name"]').show();
        } else {
          $('text[data-role="event-name"]').hide();
        }
      });

    var svgNode = document.getElementsByTagName('svg')[0];
    var defs = svgNode.getElementsByTagName('defs')[0];
    var marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'Triangle');
    marker.setAttribute('refX', '2.5');
    marker.setAttribute('refY', '2.5');
    marker.setAttribute('markerWidth', '7');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('orient', 'auto');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    marker.appendChild(path);
    path.setAttribute('d', 'M 0 0 L 5 2 L 0 5 z');
    svgNode.appendChild(defs);
    defs.appendChild(marker);
}
