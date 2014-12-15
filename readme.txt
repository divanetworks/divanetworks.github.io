DivaGraph jQuery plugin

Author: John Pansewicz, Redtopia Software, john@redtopia.com

12/15/2014 - v1.0

About This Plugin

	Built in accordance of supplied specification as a first iteration of a non-standard, data-driven, interactive graph.

	The origin of the grid is bottom/left

	All coordinates supplied through the API are specified in the scale of 0 to 100 and are mapped internally to actual screen coordinates. Drawing can occur outside of this coordinate system.

	Layering is achieved by the order in which objects occur in the svg element. If a line occurs first, and a circle that intersects it occurs second, the circle will appear on top. Otherwise, the line will appear on top. Since circles are the anchor points for lines, I'm adding them to the graph first. In order to prevent the lines from being drawn on top of the circles, I added a parameter that specifies to add the line group first in the svg element.

	The prefix option is used for creating a namespace for a graph by prefixing all element IDs within the graph. When specifying the ID of an object in the graph, do not include the prefix. The plugin uses the prefix internally. For example, if you give a circle the ID 'circle-1', and the graph has a prefix of 'diva1-', the actual ID for the element will be 'diva1-circle-1'. When you reference that circle using the API, you will use 'circle-1' and NOT 'diva-circle-1'.

	When creating circles, you can either specify a radius (not scaled - screen size) or a size (scaled to grid). All of the examples are using the scaled, grid size.

Dependencies
	
	jQuery
	d3.js

Usage - Standard jQuery plugin
	
	To initialize a graph:

	$(selector).divaGraph(options);

Default Options:

{
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
	resizeTransition: 'elastic'		// resize animation , use any d3 transition ('cubic-in-out', 'linear', 'elastic')
}

Methods

	To call a method, first initialize the plugin, then call a method like:

		$(selector).divaGraph('methodName', param1, param2, param3);

	Available methods:

		resize() - Force the grid to resize itself

		showGrid() - Shows the grid

		hideGrid() - Hides the grid

		toggleGrid() - Toggles the grid on or off

		setAspectRatio(aspectRatio) - Sets the aspect ratio for the graph

		option(optName, optValue) - Sets an option after initialization

		addObject(type, data) - Adds an object of the specified type with the specified data. The data will vary depending on the type of object you are adding.
		
		addObjectGroup(objects, prepend, id) - Adds a bunch of objects into a group. If prepend == true, will prepend the group to the svg element. 


Object Data

	Each object type takes the following data:

	NOTE: defaults for each type can be specified in the plugin initialization options. See examples.

	Line: {
		from (required): {
			x: number (x grid location),
			y: number (y grid location)
		},
		to (required): {
			x: number (x grid location),
			y: number (y grid location)
		},
		id: string (optional), 
		stroke: string (optional - color of the line),
		strokeWidth: number (optional - width of the line)
	}

	Circle: {
		x: number (required - x grid location),
		y: number (required - y grid location),
		id: string (optional, default: auto generated ID), 
		radius: number (optional, default: 0),
		size: (optional, grid size scaled to minimum dimension, default: 1),
		fill: string (color, optional),
		stroke: string (color, optional)
		strokeWidth: number (optional)
	}

	Image: {
		x: number (x grid location),
		y: number (y grid location),
		id: string (optional),
		label: object (optional) {
			text: string (the text to display),
			fontSize: number (in pixels),
			fontWeight: string ('bold', 'normal')
		},
		width: number (width of image in pixels),
		height: number (height of image in pixels)
	}

	Path: {
		data: array of objects with x, y grid coordinates [{x: number, y: number}, {x: number, y: number} .. ],
		interpolate: string (d3 interpolations - 'linear', 'basis', 'cardinal', etc),
		id: string (optional),
		stroke: string (optional - color of line),
		strokeWidth: number (optional, width of line, default: 1),
		fill: string (optional, fill color for path, default is 'none')
	}

	Curved Line: {
		start: string (optional, ID of start point),
		end: string (optional, ID of end point),
		data: array (same as Path data, used when start & end are not defined),
		id: string (optional),
		stroke: string (optional - color of line),
		strokeWidth: number (optional, width of line, default: 1),
		fill: string (optional, fill color for path, default is 'none'),
		curve: object that defines the curve {
			distance: number (distance from start point as percent of line length), 
			offset: number (grid offset from spline, negative means to left, positive means to right),
			interpolate: string (type of interpolation, any d3 interpolation - 'cardinal', 'basis', 'linear', etc)
		}
	}

Suggested Improvements

	1. Eliminate jQuery - Due to time constraints, the code is currently using both jQuery and d3. jQuery is being used to for creating the plugin and initializing the graph, but we can do the whole thing using d3. Building a d3 plugin should be very similar to the jQuery plugin I wrote.

	2. Improve image label placement and scalability - Right now, the code positions text vertically centered to the right of an image. I can see adding the ability to place text at an offset from center point of image. Also it would be nice to use em instead of px. Right now vertical calculation is done by dividing text height by 2. This can be improved by calculating the height of text instead of assuming text height is in pixels.

	3. Improve grid - Since the grid was only used for testing, not a lot of work was put into this. Right now, so that the grid is always displayed in the back, it's being prepended to the svg. However, when makeObjects() is called with prepend set to true, and the grid is on, the grid group will no longer be the first group, and will display on top of the objects added with makeObjects().

	4. There may be a way to use built in d3 scaling to apply the graph scale x(0..100) and y(0..100). Right now, the plugin is converting all points from grid to screen location coordinates.


Additional resources:

	Calculate perpendicular points off a straight line
	http://jsfiddle.net/92jWG/5/

	Example of the different kinds of interpolation methods for paths
	http://bl.ocks.org/mbostock/4342190

	How to make a d3 plugin:
	http://stackoverflow.com/questions/13983864/how-to-make-a-d3-plugin

