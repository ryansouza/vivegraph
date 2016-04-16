function sortNum(a,b){
	return a - b;
}
function sortStr(a,b){
	return a.localeCompare(b);
}
function sortDynamic(a,b){
	if( isNaN(a) )
		return sortStr(a,b);
	else
		return sortNum(parseInt(a,10), parseInt(b,10));
}
function sortLayerDynamic(a,b){
	if( isNaN(a.x) )
		return sortStr(a.x,b.x);
	else
		return sortNum(parseInt(a.x,10), parseInt(b.x,10));
}

function Filter( sourcefilter, keyselector, sumfilter, color ){
	this.source = sourcefilter;
	this.key = keyselector;
	this.sum = sumfilter;
	this.color = color;
};

Filter.prototype.transform2xy = function ( data ) {
	return { x: data.key, y: data.values };
}

Filter.prototype.run = function ( data ){
	var sum = this.sum;
	return d3.nest()
		.key( this.key )
		.rollup( function(d) { return d3.sum( d, sum ) } )
		.entries( data.filter( this.source) )
		.map( this.transform2xy );
};


function Chart( filters, x_label, y_label, margin, width, height ){

	this.margin = margin || {top: 40, right: 10, bottom: 100, left: 45};
	this.width = (width || 960) - this.margin.left - this.margin.right;
	this.height = (width || 560) - this.margin.top - this.margin.bottom;
	this.filters = filters;
	this.x_label = x_label;
	this.y_label = y_label;
	this.svg = d3.select("body").append("svg")
			.attr("width", this.width + this.margin.left + this.margin.right)
			.attr("height", this.height + this.margin.top + this.margin.bottom);
}

Chart.prototype.redraw = function ( jsondata ){
	var dataset = this.filters.map( function(f){ return f.run(jsondata); } );
	var svg = this.svg;
	var x_label = this.x_label;
	var y_label = this.y_label;
	
	svg.selectAll("*").remove();

	var x_domain = [];
	dataset.forEach( function(s){
		s.forEach( function(d){
			if( x_domain.filter( function(e){ return e === d.x; } ).length == 0 )
				x_domain.push(d.x);
		});
	});
	x_domain.sort( sortDynamic );

	var layers =  d3.layout.stack()(dataset);
	var y_max = d3.max(layers, function(layer) { return d3.max(layer, function(d) { return d.y0 + d.y; }); });

	var x = d3.scale.ordinal()
		.domain(x_domain)
		.rangeRoundBands([0, this.width], .08);

	var y = d3.scale.linear()
		.domain([0, y_max])
		.range([this.height, 0]);

	var xAxis = d3.svg.axis()
		.scale(x)
		.tickSize(3)
		.tickPadding(6)
		.orient("bottom");

	var yAxis = d3.svg.axis()
		.scale(y)
		.tickSize(0)
		.tickPadding(6)
		.orient("left");

	var svg_g = svg.append("g")
		.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

	var filters = this.filters;
	var layer = svg_g.selectAll(".layer")
		.data(layers)
		.enter().append("g")
		.attr("class", "layer")
		.style("fill", function(d, i) { return filters[i].color; });
		
	var rect = layer.selectAll("rect")
		.data(function(d) { return d; })
		.enter().append("rect")
		.attr("x", function(d) { return x(d.x); })
		.attr("y", function(d) { return y(d.y0 + d.y); })
		.attr("height", function(d) { return y(d.y0) - y(d.y0 + d.y); })
		.attr("width", x.rangeBand());

	var top_layer = layers[layers.length-1];
	top_layer.sort(sortLayerDynamic);
	var quad = [0,0,0,0];
	var i = 0;
	top_layer.forEach( function(l){
		var ix = Math.floor(i++/(top_layer.length/4));
		quad[ix] += l.y0+l.y;
	});

	var xAxisElement = svg_g.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + this.height + ")")
		.call(xAxis);
	xAxisElement.selectAll("text")
		.attr("y", 0)
		.attr("x", 9)
		.attr("dy", ".35em")
		.attr("transform", "rotate(90)")
		.style("text-anchor", "start");

	var labeldistance = xAxisElement.node().firstChild.getBBox().height;
	
	svg_g.append("g")
		.attr("class", "y axis")
		.call(yAxis);

	svg_g.append("text")
		.attr("text-anchor", "middle")
		.attr("transform", "translate(-30,"+(this.height/2)+")rotate(-90)") 
		.text(y_label);

	svg_g.append("text")
		.attr("text-anchor", "middle")
		.attr("transform", "translate("+ (this.width/2) +","+(this.height+20+labeldistance)+")")
		.text(x_label);
	svg_g.append("text")
		.attr("text-anchor", "middle")
		.attr("transform", "translate("+ (this.width/2) +","+(this.height+35+labeldistance)+")")
		.text("Number of entries in each quantile: ["+quad.toString()+"]");
}
