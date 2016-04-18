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

function calculateCumulativeDistribution(layers){
	var pdf = {}
	layers.forEach(function(l){
		for(var i =0; i<l.length; i++)
		{
			if(!pdf[l[i].x])
				pdf[l[i].x]=0;
			pdf[l[i].x]+=l[i].y;
		}
	});

	var xl = [];
	for( var xdata in pdf ){
		xl.push(xdata);
	}
	xl.sort(sortDynamic);
	
	var cdf = [];
	var total = 0;
	for( var xi in xl ){
		total+= pdf[xl[xi]];
		cdf[xi] = {x:xl[xi],y:total};
	}
	return cdf;
};

Chart.prototype.htmlForInput = function( shouldHide, checked ){
	var checked_str = checked ? "checked" : "";
	var hide_str = shouldHide ? "none" : "";
	return '<input type="radio" name="' + this._id + '" '+checked_str
		+ ' onclick="document.getElementById(\'' + this._id
		+ '\').style.display = \'' + hide_str + '\'"> ';
}

Chart.prototype.htmlForLabel = function( label, shouldHide ){
	return '<label>'+this.htmlForInput(shouldHide,!shouldHide)+label+'</label> '
}

function Chart( filters, x_label, y_label, margin, width, height ){
	this._id = Math.random();

	var div = document.createElement("div");
	div.className = "small";
	div.innerHTML = this.htmlForLabel("Show",false)+this.htmlForLabel("Hide",true);
	document.body.appendChild(div);

	this.margin = margin || {top: 40, right: 45, bottom: 100, left: 45};
	this.width = (width || 960) - this.margin.left - this.margin.right;
	this.height = (width || 560) - this.margin.top - this.margin.bottom;
	this.filters = filters;
	this.x_label = x_label;
	this.y_label = y_label;
	this.svg = d3.select("body").append("svg")
			.attr("id", this._id )
			.attr("width", this.width + this.margin.left + this.margin.right)
			.attr("height", this.height + this.margin.top + this.margin.bottom);
	this.svg_g = this.svg.append("g")
			.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
	this._labeldist = undefined;
	this.showCDF = false;
}

function makeAxis( scale, tickSize, orientation ){
	return d3.svg.axis()
		.scale(scale)
		.tickSize(tickSize)
		.tickPadding(6)
		.orient(orientation);
}

function makeDomain( dataset ){
	var x_domain = [];
	dataset.forEach( function(s){
		s.forEach( function(d){
			if( x_domain.filter( function(e){ return e === d.x; } ).length == 0 )
				x_domain.push(d.x);
		});
	});
	x_domain.sort( sortDynamic );
	return x_domain;
}

Chart.prototype.labeldistance = function(axis){
	if( this._labeldist === undefined )
		this._labeldist = axis.node().firstChild.getBBox().height;
};

Chart.prototype.appendText= function(label,position,side){
	var translate = "translate("+ position.x + "," + position.y +")";
	var rotate = side ? "rotate(-90)" : "";
	this.svg_g.append("text")
		.attr("text-anchor", "middle")
		.attr("transform", translate+rotate)
		.text(label);
};

Chart.prototype.redrawPercent = function( data ){
	var dataset = this.filters.map( function(f){ return f.run(jsondata); } );
	var percentset = dataset.map( function(entry){ 
		return entry.map( function(ds){
			var total = data.filter( function(d){ return d.location === ds.x; } ).length;
			return {
				x: ds.x,
				y: (ds.y*100)/total,
				y0: 0
			};
		});
	});
	
	if( percentset && percentset.length > 0 )
		percentset[0].sort(function(a,b){return a.y-b.y;});
	
	var x_domain = percentset[0].map(function(d){ return d.x; });

	var x = d3.scale.ordinal()
		.domain(x_domain)
		.rangeRoundBands([0, this.width], .08);

	var y = d3.scale.linear()
		.domain([0, 100])
		.range([this.height, 0]);

	var xAxis = makeAxis(x,3,"bottom");
	var yAxis = makeAxis(y,0,"left");

	this.svg_g.selectAll("*").remove();

	var filters = this.filters;
	var layer = this.svg_g.selectAll(".layer")
		.data(percentset)
		.enter().append("g")
		.attr("class", "layer")
		.style("fill", function(d, i) { return filters[i].color; });
		
	var rect = layer.selectAll("rect")
		.data(function(d) { return d; })
		.enter().append("rect")
		.attr("x", function(d) { return x(d.x); })
		.attr("y", function(d) { return y(d.y); })
		.attr("height", function(d) { return y(0) - y(d.y); })
		.attr("width", x.rangeBand());
		
	this.addAxis(xAxis,yAxis);
	this.addLabels();
};

Chart.prototype.redrawLine = function( xydata ){
	var x_min = d3.min(xydata, function(d){ return d.x; } );
	var x_max = d3.max(xydata, function(d){ return d.x; } );
	var x = d3.scale.linear()
		.domain([x_min,x_max])
		.range([0, this.width]);

	var y = d3.scale.linear()
		.domain([0, 100])
		.range([this.height, 0]);
	var xAxis = makeAxis(x,3,"bottom");
	xAxis.tickFormat( function(d) { return new Date(d).toISOString().slice(0, 10); });
	var yAxis = makeAxis(y,3,"left");

	var dataline =  d3.svg.line()
		.x(function(d) { return x(d.x); })
		.y(function(d) { return y(d.y); })
		.interpolate("linear");
	this.svg_g.selectAll("*").remove();
	this.svg_g.append("g").append("rect")
		.attr("x", "0")
		.attr("y", "0")
		.attr("height", this.height)
		.attr("width", this.width)
		.attr("fill", "white");
	this.svg_g.append("g").append("path")
		.attr("d", dataline(xydata))
		.attr("stroke", "black")
		.attr("stroke-width", 2)
		.attr("fill", "none");
	this.svg_g.append("g").append("path")
		.attr("d", dataline(xydata)+"L"+this.width+","+this.height+"L0,"+this.height)
		.attr("fill", "#0a0");

	this.addAxis( xAxis, yAxis );
	this.addLabels();
	yAxis.orient("right");
	this.svg_g.append("g")
		.attr("class", "y axis")
		.attr("transform", "translate("+this.width+")")
		.call(yAxis);

};

Chart.prototype.addAxis = function( x, y ){
	var em = this.svg_g.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + this.height + ")")
		.call(x);
	em.selectAll("text")
		.attr("y", 0)
		.attr("x", 9)
		.attr("dy", ".35em")
		.attr("transform", "rotate(90)")
		.style("text-anchor", "start");
	this.labeldistance(em); //cache label size

	this.svg_g.append("g")
		.attr("class", "y axis")
		.call(y);
};
Chart.prototype.addLabels = function(){
	this.appendText( this.y_label, { x: -30, y: this.height/2 }, true );
	this.appendText( this.x_label, { x: this.width/2, y: this.height + 20 + this._labeldist } );
};
Chart.prototype.redraw = function ( jsondata ){
	var dataset = this.filters.map( function(f){ return f.run(jsondata); } );

	var x_domain = makeDomain(dataset);
	var layers =  d3.layout.stack()(dataset);
	var y_max = d3.max(layers, function(layer) { return d3.max(layer, function(d) { return d.y0 + d.y; }); });
	var cdf = calculateCumulativeDistribution(layers);

	var x = d3.scale.ordinal()
		.domain(x_domain)
		.rangeRoundBands([0, this.width], .08);
		
	var xpoint = d3.scale.ordinal()
		.domain(x_domain)
		.rangeRoundPoints([0, this.width], .08);

	var y = d3.scale.linear()
		.domain([0, y_max])
		.range([this.height, 0]);

	var y2_max =d3.max(cdf,function(d){return d.y});
	var y2 = d3.scale.linear()
		.domain([0, y2_max])
		.range([this.height, 0]);


	var xAxis = makeAxis(x,3,"bottom");
	var yAxis = makeAxis(y,0,"left");
	var y2Axis = makeAxis(y2,0,"right");

	this.svg_g.selectAll("*").remove();

	var filters = this.filters;
	var layer = this.svg_g.selectAll(".layer")
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
	
	if( this.showCDF )
	{
		var cdfLine =  d3.svg.line()
			.x(function(d) { return xpoint(d.x); })
			.y(function(d) { return y2(d.y); })
			.interpolate("bundle");
		this.svg_g.append("g").append("path")
			.attr("d", cdfLine(cdf))
			.attr("stroke", "black")
			.attr("stroke-dasharray","5,4")
			.attr("stroke-width", 2)
			.attr("fill", "none");
		this.svg_g.append("g")
			.attr("class", "y axis")
			.attr("transform", "translate("+this.width+")")
			.call(y2Axis);
		this.appendText( "CDF", { x: this.width-4, y: this.height/2 }, true );
	}
	
	this.addAxis( xAxis, yAxis );
	this.addLabels();
}

