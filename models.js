
var Group = function( name, entries, parent ){
	this.name = name;
	this.entries = entries;
	this.parent = parent;
    this.triggerRedraw = this.triggerRedraw.bind(this); // ko specific handling when click binding $parent
};
Group.prototype.setAll = function(val){
	this.entries.forEach(function(e){
		document.getElementById(e).checked = val;
	});
};
Group.prototype.checked = function(){
	this.setAll(document.getElementById(this.name).checked);
	this.parent.locationDirty=true;
	this.parent.delayedRedraw();
	return true;
};
Group.prototype.triggerRedraw = function(){
	this.parent.locationDirty = true;
	this.parent.delayedRedraw();
	return true;
};

var RegionModel = function( redraw ){
	this.locationGroups = [
		new Group("Other", ["None","AU","NZ","CN","JP","TW"], this ),
		new Group("United States", ["US","US-AK","US-AL","US-AR","US-AZ","US-CA","US-CO","US-CT","US-DC","US-DE","US-FL","US-GA",
			"US-HI","US-IA","US-ID","US-IL","US-IN","US-KS","US-KY","US-LA","US-MA","US-MD","US-ME","US-MI","US-MN","US-MO","US-MS",
			"US-MT","US-NC","US-ND","US-NE","US-NH","US-NJ","US-NM","US-NV","US-NY","US-OH","US-OK","US-OR","US-PA","US-PR","US-RI",
			"US-SC","US-SD","US-TN","US-TX","US-UT","US-VA","US-VT","US-WA","US-WI","US-WV","US-WY"], this ),
		new Group("Canada", ["CA","CA-AB","CA-BC","CA-MB","CA-NB","CA-NL","CA-NT","CA-NS","CA-NU","CA-ON","CA-PE","CA-QC","CA-SK","CA-YT"], this ),
		new Group("Europe", ["AT","BE","CH","CZ","DE","DK","ES","FI","FR","IE","IS","IT","NL","NO","PL","SE","UK"], this )
	];
	var currentDatePlusSome = new Date().getTime()+100000000
	this.locations = {};
	this.datefilter = ko.observable(currentDatePlusSome);
	this.dateval = ko.observable(new Date().toISOString().slice(0, 10));
	this.maxvalue = currentDatePlusSome;
	this.delayActive=true;
	this._redraw = redraw;
	this.showCDF = ko.observable(false);
	this.locationDirty = true;
};
RegionModel.prototype.toggleAll = function(){
	var val = document.getElementById("toggleAll").checked;
	this.locationGroups.forEach( function(g){
		document.getElementById(g.name).checked = val;
		g.setAll( val );
	});
	this.locationDirty = true;
	this.delayedRedraw();
	return true;
};

RegionModel.prototype.delayedRedraw = function(){
	var that = this;
	if( that.delayActive )
		return true;
	that.delayActive = true;
	setTimeout(function(){
		that._redraw();
		that.delayActive=false;
	},100);
	return true;
};
RegionModel.prototype.updateLocations = function(){
	var l = {};
	this.locationGroups.forEach(function(g){
		g.entries.forEach(function(e){
			l[e]=document.getElementById(e).checked;
		});
	});
	this.locations = l;
};
