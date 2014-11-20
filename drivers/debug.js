exports.init = function(config, status) {
	console.log("--- init ---");
	return true;
}

exports.update = function(config, status, zones) {
	console.log("--- update ---");
	for ( var zone_id in zones) {
		console.log("zone: " + zone_id + ", mode: " + zones[zone_id]);
	}
	return true;
}