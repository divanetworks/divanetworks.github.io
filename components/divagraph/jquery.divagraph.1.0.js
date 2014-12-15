/*
DivaGraph jQuery plugin

Author: John Pansewicz, john@redtopia.com

12/15/2014 - v1.0 - Initial version to chart circles with curved lines connecting them. 
	Considered work in progress.
*/

'use strict';

(function($){
	
	var divaGraph = function (element, options) {
		
		var $elem = $(element).addClass('divagraph'),
			$this = this,
			$id = $($elem).prop('id'),
			$opts = $.extend(true, {}, $.fn.divaGraph.defaults, options),
			$svg,
			$aspectRatio = 16 / 9,
			$grid = null,
			$objects = {},
			$resizeTimer = null;

		init();

		function init () {

			/* initializes the plugin */
			
			if (typeof($id) == 'undefined' || !$id.length) {
				$id = createID();
				$(elem).prop('id', $id);
			}

			$svg = d3.select('#' + $id).append("svg");

			if ($opts.bgColor && $opts.bgColor.length) {
				$svg.style('background-color', $opts.bgColor);
			}

			doSetAspectRatio();

			doResize(false);

			$(window).on('resize.' + $id, function () {
				doResize(true);
			});

		} // init()

		function doSetAspectRatio () {

			var rx = $opts.aspectRatio.match(/(\d+):(\d+)/),
				w,
				h;
			
			debug('aspect ratio: ' + $opts.aspectRatio);

			if (rx && rx.length === 3) {
				w = parseInt(rx[1]);
				h = parseInt(rx[2]);
				if (!isNaN(w) && w > 0 && !isNaN(h) && h > 0) {
					$aspectRatio = w / h;
					debug('aspect ratio set: ' + $aspectRatio);
				}

			}

		} // doSetAspectRatio()

		function doHideGrid () {
			
			debug('hiding grid');

			if ($grid) {
				$grid.remove();
				$grid = null;
			}
		
		} // doHideGrid()

		function doShowGrid () {
			
			debug('showing grid');

			if ($grid || $opts.gridSize <= 0) {
				return;
			}
			
			// create the grid group object
			$grid = $svg.insert('g', ':first-child');

			// add the lines to the group
			var line;
			
			for (var i = 0; i < (100 / $opts.gridSize); i++) {
				//gridItem = {};
				
				// create horizontal line
				line = {
					from: {
						x: 0, 
						y: i*$opts.gridSize
					},
					to: {
						x: 100, 
						y: i*$opts.gridSize
					},
					strokeWidth: 1,
					stroke: $opts.gridColor
				};
				//debug('grid hline: ', line);
				addLine(line, $grid);
				
				// create vertical line
				line = {
					from: {
						x: i*$opts.gridSize, 
						y: 0
					}, 
					to: {
						x: i*$opts.gridSize, 
						y: 100
					},
					strokeWidth: 1,
					stroke: $opts.gridColor
				};
				// create vertical line
				//debug('grid vline: ', line);
				addLine(line, $grid);
			}

		} // doShowGrid()

		function xGrid (x, width) {
			
			if (typeof(width) === 'undefined') {
				width = $($elem).width();
			}
			
			return(width * (x / 100));
		
		} // xGrid()

		function yGrid (y, height) {
			
			if (typeof(height) === 'undefined') {
				height = $($elem).height();
			}
			
			return(height - (height * (y / 100)));
		
		} // yGrid()

		function toGrid(x, y) {
			
			// converts x & y grid coordinates to x & y coordinates on the grid
			
			return({
				x: xGrid(x),
				y: yGrid(y)
			});
		
		} // toGrid()

		function calcRadius (radius, size) {
			
			// either returns the specified radius, or a calculated radius based on size

			var r = radius;
			
			if (r <= 0 && size > 0) {
				// create a radius based on percentage of minimum svg dimension
				var svgSize = Math.min($($elem).height(), $($elem).width());
				r = svgSize * (size / 100);
			}
				
			debug('calcRadius - radius: ' + radius + ', size: ' + size + ', svgSize: ' + svgSize + ', calc: ' + r);
			
			return(r);
		
		} // calcRadius()

		function scaleRect (width, height, scale, minWidth) {
			if (typeof(minWidth) === 'undefined') {
				minWidth = 0;
			}
			var w = $($elem).width() * scale,
				rWidth = w * scale,
				pDiff,
				r;

			if (rWidth < minWidth) {
				rWidth = minWidth;
			}

			pDiff = rWidth / width,

			r = {
				width: rWidth,
				height: height * pDiff
			};

			debug('scaleRect - w: ' + width + ', h: ' + height + ', scale: ' + scale + ', rWidth: ' + rWidth + ', pdiff: ' + pDiff, r);
			
			return(r);
		}

		function mapObject (type, obj, opts) {
			
			// maps the specified object to the internal object map

			var id = obj.attr('id');
			
			debug('adding object: ' + type + ', id: ' + id);
			
			// Make sure the ID doesn't already exist. If it does, create a new ID.

			if (typeof($objects[id]) !== 'undefined') {
				debug('object already exists - id: ' + id + ', creating new ID');
				id = createID();
				debug('new id: ' + id);
				id = $opts.prefix + id;		// all IDs are stored with the prefix
				obj.attr('id', id);
			}

			$objects[id] = {
				id: id,
				type: type,
				obj: obj,
				opts: opts
			}
			
		} // mapObject()

		function createID () {

			// creates an id for an object

			return('dgrph-' + Math.floor(Math.random()*1000000));
			
		} // createID()

		function getObjectCoords (id) {
			
			// Returns the coordinates of an object. This is done by calling the getCoords() callback if it exists.
			
			var coords;
			
			try {
				// add the prefix
				id = $opts.prefix + id;

				//debug('getcoords, id: ' + id);
				coords = $objects[id].opts.getCoords($objects[id].obj, $objects[id].opts);
			} catch (err) {
				debug('getcoords error: ' + err);
				coords = {x: 0, y: 0};
			}
			
			return(coords);
		
		} // getObjectCoords()

		function lineDistance(point1, point2) {
			
			// calculates the distance between 2 points
			
			var xs = 0,
				ys = 0;

			xs = point2.x - point1.x;
			xs = xs * xs;

			ys = point2.y - point1.y;
			ys = ys * ys;

			return(Math.sqrt(xs + ys));
		
		} // lineDistance()

		function getPointAtDistance (p1, p2, distance, isPercent) {

			// returns the point at a given distance along a line defined as p1, p2

			var x3 = p2.x - p1.x,
				y3 = p2.y - p1.y,
				length = Math.sqrt(x3 * x3 + y3 * y3);
				
			if (isPercent === true) {
				// if the distance param is a percent (of line length) value
				// recaculate distance
				distance = length * (distance/100);
			}

			x3 /= length;
			y3 /= length;

			x3 *= distance;
			y3 *= distance;

			return ({
				x: p1.x + x3,
				y: p1.y + y3
			});
		
		} // getPointAtDistance()

		function calcPerpPoint (p1, p2, p3, offset) {
			
			/*
			Calculates the location of a point that is 
			perpendicular to the line (p1, p3) at point p2, at the offset
			distance from the line. Negative offset means to the left,
			positive offset is to the right. Direction is based on 
			start point p1 to end point p3.
			*/

			var angle = Math.atan2(p3.y - p1.y, p3.x - p1.x),
				x,
				y;

			if (offset > 0) {
				// to the right (from start point)
				x = (Math.sin(angle) * offset + p2.x); 
				y = (-Math.cos(angle) * offset + p2.y);
			}
			else {
				// to the left
				x = (-Math.sin(angle) * -offset + p2.x);
				y = (Math.cos(angle) * -offset + p2.y);
			}

			return({x: x, y: y});
		
		} // calcPerpPoint()

		function curvePoint (start, end, curve) {

			// determines the point to add to a line, making a path that will generate a curve
			// called from addCurvedLine, caller of addCurvedLine() defines the curve as:
			// 		curve.distance - from start point in percent
			//		curve.offset - offset from line (positive is to right, negative is to left of start point)

			var pt3 = getPointAtDistance(start, end, curve.distance, true),
				pt4 = calcPerpPoint(start, pt3, end, curve.offset);
			
			return(pt4);
		
		} // curvePoint()

		function addCircle(opts, group) {
			
			// creates a circle
			
			var o = $.extend(true, {}, {
					x: 20,
					y: 20,
					id: createID(),
					radius: $opts.circles.radius,
					size: $opts.circles.size,
					fill: $opts.circles.fill,
					strokeWidth: $opts.circles.strokeWidth,
					stroke: $opts.circles.stroke,
					getCoords: function (object, data) {
						return({x: data.x, y: data.y});
					},
					resize: function (object, data) {
						object.transition()
							  .ease('elastic')
							  .duration($opts.resizeSpeed)
							  .attr('cx', xGrid(data.x))
							  .attr('cy', yGrid(data.y))
							  .attr('r', calcRadius(data.radius, data.size));
					}
				}, opts),
				id = $opts.prefix + o.id,
				pt = toGrid(o.x, o.y),
				radius = calcRadius(o.radius, o.size),
				circle = (typeof(group) !== 'undefined') ? group.append('circle') : $svg.append('circle');

				circle.attr('id', id)
					  .attr('cx', pt.x)
					  .attr('cy', pt.y)
					  .attr('r', radius)
					  .attr('fill', o.fill);

				if (o.strokeWidth > 0) {
					circle.attr('stroke-width', o.strokeWidth)
						  .attr('stroke', o.stroke);
				}

			mapObject('circle', circle, o);

			debug('circle - x: ' + pt.x + ', y: ' + pt.y);
			
			return(circle);
		
		} // addCircle()

		function textPosition (label, imgCoords, imgRect) {
			// currently places label vertically aligned to right of image
			return({x: imgCoords.x + (imgRect.width/2), y: imgCoords.y + (label.fontSize / 2)});
		}

		function addImage(opts, group) {
			
			// creates an image
			
			var o = $.extend(true, {}, {
					x: 20,
					y: 20,
					id: createID(),
					label: null,
					width: 100,
					height:100,
					getCoords: function (object, data) {
						//debug('image coords', data);
						return({x: data.x, y: data.y});
					},
					resize: function (object, data) {
						debug('resizing image');
						var pt = toGrid(data.x, data.y),
							r = scaleRect(data.width, data.height, data.scale),
							img = object.select('image'),
							txt = object.select('text');

						//debug('resize image: ', img);

						img.transition()
							.ease($opts.resizeTransition)
							.duration($opts.resizeSpeed)
							.attr('x', pt.x - (r.width/2))
							.attr('y', pt.y - (r.height/2))
							.attr('width', r.width)
							.attr('height', r.height);

						if (txt.length) {
							pt = textPosition(data.label, pt, r);
							txt.transition()
								.ease($opts.resizeTransition)
								.duration($opts.resizeSpeed)
								.attr('x', pt.x)
								.attr('y', pt.y);
						}
					}
				}, opts),
				id = $opts.prefix + o.id,
				pt = toGrid(o.x, o.y),
				r = scaleRect(o.width, o.height, o.scale),
				imgGroup = (typeof(group) !== 'undefined') ? group.append('g') : $svg.append('g'),
				image = imgGroup.append('svg:image');

				imgGroup.attr('id', id);

				image.attr('id', id + '-img')
					  .attr('x', pt.x - (r.width/2))
					  .attr('y', pt.y - (r.height/2))
					  .attr('width', r.width)
					  .attr('height', r.height)
					  .attr('xlink:href', o.src)

				if (o.label) {
					// images can have a label - for now, text is placed vertically centered to the right of the image
					o.label = $.extend({}, {
						text: '',
						fontFamily: $opts.text.fontFamily, 
						fontSize: $opts.text.fontSize, 
						color: $opts.text.color
					}, o.label);
					if (o.label.text.length) {
						pt = textPosition(o.label, pt, r);
						var text = imgGroup.append('text')
							.attr('x', pt.x)
							.attr('y', pt.y)
							.text(o.label.text)
							.attr('font-family', o.label.fontFamily)
							.attr('font-size', o.label.fontSize + 'px')
							.attr('fill', o.label.color);
					}
				}

			mapObject('image', imgGroup, o);

			debug('image - x: ' + pt.x + ', y: ' + pt.y);
			
			return(imgGroup);
		
		} // addImage()

		function addLine(opts, group) {

			var o = $.extend(true, {}, {
					from: {
						x: 0,
						y: 10
					},
					to: {
						x: 10,
						y: 20
					},
					id: createID(),
					stroke: $opts.lines.stroke,
					strokeWidth: $opts.lines.strokeWidth,
					resize: function (object, data) {
						var pt1 = toGrid(data.from.x, data.from.y),
							pt2 = toGrid(data.to.x, data.to.y);
						//debug('resize line', {origFrom: data.from, from: pt1, origTo: data.to, to: pt2});
						object.transition()
							.ease($opts.resizeTransition)
							.duration($opts.resizeSpeed)
							.attr('x1', pt1.x)
							.attr('y1', pt1.y)
							.attr('x2', pt2.x)
							.attr('y2', pt2.y);
					}
				}, opts),
				id = $opts.prefix + o.id,
				pt1 = toGrid(o.from.x, o.from.y),
				pt2 = toGrid(o.to.x, o.to.y),
				line = (typeof(group) !== 'undefined') ? group.append('line') : $svg.append('line');

			line.attr('id', id)
				.attr('x1', pt1.x)
				.attr('y1', pt1.y)
				.attr('x2', pt2.x)
				.attr('y2', pt2.y)
				.attr('stroke', o.stroke)
				.attr('stroke-width', o.strokeWidth);
			
			mapObject('line', line, o);
			
			//debug('line - x1: ' + pt1.x + ', y1: ' + pt1.y + ', x2: ' + pt2.x + ', y2: ' + pt2.y, o);
			
			return(line);
		
		} // addLine()

		function addPath(opts, group) {

			var o = $.extend(true, {}, {
					data: [],
					interpolate: 'linear',
					id: createID(),
					stroke: '#ccc',
					strokeWidth: 1,
					fill: 'none'
				}, opts),
				id = $opts.prefix + o.id,
				fnLine = d3.svg.line()
							.x(function(d) { return xGrid(d.x); })
							.y(function(d) { return yGrid(d.y); })
							.interpolate(o.interpolate),
				path = (typeof(group) !== 'undefined') ? group.append('path') : $svg.append('path');
				
			path.attr('id', id)
				.attr("d", fnLine(o.data))
				.attr("stroke", o.stroke)
				.attr("stroke-width", o.strokeWidth)
				.attr("fill", o.fill);

			mapObject('path', path, o);

			return(path);

		} // addPath()

		function addCurvedLine(opts, group) {

			var o = $.extend(true, {}, {
					start: null,
					end: null,
					data: null,
					id: createID(),
					stroke: $opts.lines.stroke,
					strokeWidth: $opts.lines.strokeWidth,
					fill: $opts.lines.fill,
					curve: {distance: 50, offset: 10, interpolate: 'cardinal'},
					resize: function (object, data) {
						// recalculate the line
						var start = getObjectCoords(data.start),
							end = getObjectCoords(data.end),
							mid = curvePoint(start, end, data.curve);
						data.data = [start, mid, end];
						object.transition()
							  .ease('elastic')
							  .duration($opts.resizeSpeed)
							  .attr('d', fnLine(data.data));
					}
				}, opts),
				id = $opts.prefix + o.id,
				fnLine = d3.svg.line()
					.x(function(d) { return xGrid(d.x); })
					.y(function(d) { return yGrid(d.y); })
					.interpolate(o.curve.interpolate),
				path;
			
			// verify & conform data
			if (o.data && o.data.length) {
				alert('addCurvedLine() - data not supported.');
				return;
			}
			if (typeof(o.start) === 'string' && o.start.length && typeof(o.end) === 'string' && o.end.length) {
				var start = getObjectCoords(o.start),
					end = getObjectCoords(o.end),
					mid = curvePoint(start, end, o.curve);
				o.data = [start, mid, end];
			}
			else {
				alert('addCurvedLine() - data not found.');
				return;
			}

			// add the path the specified group, or directly to the svg
			path = (typeof(group) !== 'undefined') ? group.append('path') : $svg.append('path');

			// set the path attributes
			path.attr('id', id)
				.attr("d", fnLine(o.data))
				.attr("stroke", o.stroke)
				.attr("stroke-width", o.strokeWidth)
				.attr("fill", o.fill);

			// add the object to the object mapping
			mapObject('path', path, o);

			return(path);
			
		} // addCurvedLine()

		function doAddObjectGroup (objects, prepend, id) {
			var id = (typeof(id) === 'string' && id.length) ? id : createID(),
				group = (prepend === true) ? $svg.insert('g', ':first-child') : $svg.append('g');

			group.attr('id', id);

			$.each(objects, function (ix, object) {
				var o = $.extend(true, {}, {
							type: 'unknown',
							data: {}
						}, object);

				switch(o.type) {
					case 'circle':
						addCircle(o.data, group);
						break;
					case 'curvedLine':
						addCurvedLine(o.data, group);
						break;
					case 'line':
						addLine(o.data, group);
						break;
					case 'path':
						addPath(o.data, group);
						break;
					default:
						debug('unknown object type: ' + o.type);
				}
			});
		}

		function resizeObjects () {
			//debug('resizing objects', $objects);
			$.each($objects, function (ix, object) {
				if (typeof(object.opts.resize) === 'function') {
					debug('resizing object', object);
					object.opts.resize(object.obj, object.opts);
				}
			});
		}

		function resizeGraph () {
			debug('resizing graph');
			resizeObjects();
		} // resizeGrid()
		
		function doResize (useTimer) {
			
			// resize the wrapper to maintain specified aspect ratio
			
			var w = $($elem).width(),
				h = Math.ceil(w/$aspectRatio);
			
			$($elem).css('height', h + 'px');

			if ($resizeTimer) {
				clearTimeout($resizeTimer);
			}
			
			if (useTimer === false) {
				resizeGraph();
				return;
			}

			$resizeTimer = setTimeout(function () {
				resizeGraph();
				$resizeTimer = null;
			}, 100);

		} // doResize()

		function debug (msg, data, label) {
			if (!$opts.debug) {
				return;
			}
			if (typeof(window.console) === 'undefined' || typeof(window.console.log) === 'undefined') {
				return;
			}
			if (typeof(label) === 'undefined') {
				label = 'divaGraph';
			}
			var type = typeof(msg);
			switch(type) {
				case 'object':
					if (window.console.dir) {
						window.console.dir(msg);
					}
					else {
						window.console.log(label + ': ' + msg);
					}
					break;

				case 'string':
					window.console.log(label + ': ' + msg);
					if (typeof(data) === 'object') {
						if (window.console.dir) {
							window.console.dir(data);
						}
						else {
							window.console.log(label + ': ' + data);
						}
					}
					break;
			}
		}

		/*
		PUBLIC METHODS - use $(selector).divaGraph('fnName', p1, p2, p3);
		*/

		this.resize = function () {
			// forces a resize of the svg element and all objects inside
			doResize(false);
		};

		this.showGrid = function () {
			// shows the grid
			doShowGrid();
		};

		this.hideGrid = function () {
			// hides the grid
			doHideGrid();
		};

		this.toggleGrid = function () {
			// toggles the grid on/off
			debug('toggle grid');
			if ($grid) {
				doHideGrid();
			}
			else {
				doShowGrid();
			}
		};

		this.addObject = function (type, data) {

			switch (type) {
				case 'path':
					return(addPath(data));
				case 'circle':
					return(addCircle(data));
				case 'line':
					return(addLine(data));
				case 'curvedLine':
					return(addCurvedLine(data));
				case 'image':
					return(addImage(data));
			}

			return({error: 'Object type is not supported: ' + type});

		};

		this.addObjectGroup = function (objects, prepend, id) {
			// creates an array of objects inside a group
			return(doAddObjectGroup(objects, prepend, id));
		};

		this.setAspectRatio = function (aspectRatio) {
			// sets the aspect ratio
			$opts.aspectRatio = aspectRatio;
			doSetAspectRatio();
			doResize(false);
		};

		this.option = function (optName, optValue) {
			// sets an option after initialization
			$opts[optName] = optValue;
		};

	}; // END PLUGIN

	/*
	PUBLIC divaGraph() - main plugin function
	*/

	$.fn.divaGraph = function (options, p, v1, v2, v3) {
		var r = [];
		this.each (function () {
			var element = $(this),
				jq = element.data('divaGraph');
			
			// handle when the plugin exists, and options is a function call
			if (typeof(options) == 'string') {
				if (typeof(jq) !== 'undefined') {
					var fn = jq[options];
					if (typeof(fn) === 'function') {
						r.push(fn(p, v1, v2, v3));
					}
				}
				else {
					r.push(null);
				}
				return;
			}
			
			// return early if this element already has a plugin instance
			if (jq) {
				return;
			}
			
	  		// store plugin object in this element's data
			element.data('divaGraph', new divaGraph(this, options));
		});
		if (r.length > 0) {
			if (this.length == 1)
				return(r[0]);
			return(r);
		}
		return (this);
	};

	$.fn.divaGraph.defaults = {
		debug: false,					// true to send debug messages to console
		aspectRatio: '16:9',			// aspect ratio of svg
		prefix: 'divag-',				// namespace prefix for creating element IDs
		gridSize: 10,					// size of grid (for display purposes)
		gridColor: '#eee',				// color of the grid
		bgColor: '#fff',				// background color of the svg element
		lines: {						// default values for line drawing
			stroke: '#ccc',					// color
			strokeWidth: 1,					// line width
			fill: 'none'					// fill color
		},
		circles: {						// default values for circle drawing
			stroke: '#ccc',					// border color
			strokeWidth: 0,					// border width
			fill: '#ccc',					// fill color
			radius: 0,						// radius - specifies a default radius (not scaled) - if 0, use size instead
			size: 1 						// size - size in scale units (used if radius is 0)
		},
		text: {							// default values for text rendering
			fontFamily: 'sans-serif',		// font family
			fontSize: 20,					// font size in px (use number value, not string)
			fontWeight: 'normal',			// font weight
			color: '#333'					// font color
		},
		resizeSpeed: 500,				// ms for resize animation
		resizeTransition: 'elastic'		// transtion animation to use for resize
	};
	
})(jQuery);
