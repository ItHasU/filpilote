exports.init = function(config, status) {
	console.log("--- init ---");
	status.iteration = 0;
	return true;
}

exports.update = function(config, status, zones) {
	console.log("--- update (" + status.iteration++ + ")---");
	for ( var zone_id in zones) {
		console.log("zone: " + zone_id + ", mode: " + zones[zone_id]);
	}
	return true;
}

exports.destroy = function(config, status) {
	console.log("--- destroy ---");
	status.iteration = undefined;
}