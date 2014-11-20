// -- GPIO --------------------------------------------------------------------

/**
 * Initialisation d'une sortie du RPi
 */
function _gpio_open(status, io) {
	if (status.gpio === undefined) {
		console.log("gpio: open " + io);
		return;
	} else {
		status.gpio_devices[io] = status.gpio.export(io, {
			direction : "out",
			ready : function() {
				// Un vilain hack pour gérer un bug
				setTimeout(function() {
					status.gpio_devices[io].setDirection("out");
				}, 100);
			}
		});
	}
}

/**
 * Fermeture d'une sortie du RPi
 */
function _gpio_close(status, io) {
	if (status.gpio === undefined) {
		return;
	} else {
		var dev = status.gpio_devices[io];
		dev.removeAllListeners();
		dev.reset();
		dev.unexport();
		delete status.gpio_devices[io];
	}
}

/**
 * Changement de l'état d'une sortie du RPi
 */
function _gpio_set(status, io, value) {
	if (status.gpio === undefined) {
		return;
	} else {
		if (status.gpio_devices[io] !== undefined) {
			status.gpio_devices[io].set(value);
		}
	}
	status.gpio_devices_debug[io] = value;
}

// -- Raspberry pi ------------------------------------------------------------

/**
 * Ouverture des GPIOs pour toutes les zones
 */
exports.init = function(config, status) {
	// Chargement du module gpio pour le Raspberry Pi (optionnel)
	status.gpio = undefined;
	status.gpio_devices = {};
	status.gpio_devices_debug = {};

	try {
		status.gpio = require("gpio");
	} catch (e) {
		console.error("error: Unable to load module gpio");
		console.error(e);
		return false;
	}
	for ( var i_zone in config.zones) {
		var zone = config.zones[i_zone];
		for ( var i_io in zone.ios) {
			_gpio_open(status, zone.ios[i_io]);
		}
	}
	return true;
}

/** Met à jour les GPIO du RPi en fonction des modes activés sur les radiateurs */
exports.update = function(config, status, zones) {
	for ( var zone_id in zones) {
		var ios = config[zone_id];
		var mode = zones[zone_id];
		var io0 = ios[0];
		var io1 = ios[1];

		var io0_state = (mode & 1) !== 0 ? 1 : 0;
		var io1_state = (mode & 2) !== 0 ? 1 : 0;

		_gpio_set(status, io0, io0_state);
		_gpio_set(status, io1, io1_state);
	}
	return true;
}

/**
 * Fermeture des GPIOs pour toutes les zones
 */
exports.destroy = function(config, status) {
	for ( var io in status.gpio_devices) {
		_gpio_close(status, io);
	}
}