// -- Globals -----------------------------------------------------------------

/*
 * Configuration (à l'arrache, directement dans le fichier). Sera modifiée
 * dynamiquement pour prendre en compte le mode courant
 */
var config = {
	"modes" : {
		4 : "Normal",
		3 : "Economique",
		2 : "Hors-gel",
		1 : "Eteint"
	},
	"zones" : {
		1 : {
			"name" : "Salon",
			"ios" : [ 4, 17 ]
		},
		2 : {
			"name" : "Chambres",
			"ios" : [ 27, 22 ]
		},
		3 : {
			"name" : "Salles de bains",
			"ios" : [ 23, 24 ]
		}
	},
	"programs" : {
		1 : {
			"name" : "Semaine de travail",
			"defaults" : {
				1 : 4,
				2 : 4,
				3 : 2,
			},
			"rules" : [ {
				"days" : [ 1, 2, 3, 4, 5 ],
				"zones" : [ 3 ],
				"from" : 360, // 6:00
				"to" : 510, // 8:30
				"mode" : 4, // Confort
			}, {
				"days" : [ 1, 2, 3, 4, 5 ],
				"zones" : [ 2 ],
				"from" : 510, // 8:30
				"to" : 1020, // 17:00
				"mode" : 3, // Eco
			} ]
		},
		2 : {
			"name" : "Personne à la maison",
			"defaults" : {
				1 : 2,
				2 : 2,
				3 : 2,
			},
			"rules" : []
		},
	}
};

var status = {
	"program" : 1,
	"zones" : {},
	"gpio_devices" : {},
	"gpio_devices_debug" : {},
	"manuals" : [],
}

// -- App ---------------------------------------------------------------------

var express = require('express')
var app = express()

// -- Static files ------------------------------------------------------------

app.use(express.static('static', {
	dotfiles : 'ignore',
	index : "index.html",
	redirect : false,
}));

// -- API : Config ------------------------------------------------------------

app.get("/api/config", function(req, res) {
	res.send(config);
});

// -- API : Status ------------------------------------------------------------

app.get("/api/status", function(req, res) {
	res.send(status);
});

// -- API : Manuals -----------------------------------------------------------

app.get("/api/manual/:zone/:mode/:minutes", function(req, res) {
	try {
		var zone_id = parseInt(req.params.zone);
		var mode = parseInt(req.params.mode);
		var duration_minutes = parseInt(req.params.minutes);
		var start_ms = Date.now();

		manuals_push(zone_id, mode, start_ms, duration_minutes);

		res.send({
			"msg" : "success"
		});
	} catch (e) {
		console.error(e);
		res.send({
			"msg" : "error: Invalid parameter",
			"exception" : e
		});
	}
});

app.get("/api/manual/cancel/:id", function(req, res) {
	try {
		var manual_id = parseInt(req.params.id);
		manuals_remove(manual_id);
		res.send({
			"msg" : "success"
		});
	} catch (e) {
		console.error(e);
		res.send({
			"msg" : "error: Invalid parameter",
			"exception" : e
		});
	}
});

// -- API : Set program -------------------------------------------------------

app.post("/api/prog/:id", function(req, res) {
	try {
		var id = parseInt(req.params.id);
		// TODO
	} catch (e) {
		res.send({
			"msg" : "Exception thrown",
			"ex" : e,
		});
	}
});

// -- Manual schedules --------------------------------------------------------

/**
 * Regarde dans les règles temporaires s'il y a une correspondance. Renvoie
 * undefined si aucun résultat.
 */
function manuals_get(zone_id, date) {
	var instant;
	if (date === undefined) {
		instant = Date.now();
	} else {
		instant = date.getTime();
	}

	var res = undefined;
	for (var i = 0; i < status.manuals.length; i++) {
		var rule = status.manuals[i];

		// Est-ce que la zone est dans la règle ?
		if (rule.zone != zone_id) {
			continue;
		}

		// Est-ce que la date est concernée ?
		if (rule.from_utc <= instant && instant < rule.to_utc) {
			// Entre le début et la fin => OK
		} else {
			continue;
		}

		// On prend la règle la plus confortable
		if (res === undefined || res < rule.mode) {
			res = rule.mode;
		}
	}
	return res;
}

/**
 * Force une ou plusieurs zones pendant un certain temps.
 */
function manuals_push(zone_id, mode, start_ms, duration_minutes) {
	var finish_ms = start_ms + duration_minutes * 60 * 1000;
	var new_id = 0;
	for (var i = 0; i < status.manuals.length; i++) {
		if (status.manuals[i].id > new_id) {
			new_id = status.manuals[i].id;
		}
	}
	new_id++;

	var tmp_rule = {
		id : new_id,
		zone : zone_id,
		from_utc : start_ms,
		to_utc : finish_ms,
		mode : mode,
	}
	status.manuals.push(tmp_rule);
}

function manuals_remove(manual_id) {
	var to_keep = [];
	for (var i = 0; i < status.manuals.length; i++) {
		if (manual_id !== undefined && status.manuals[i].id != manual_id) {
			to_keep.push(status.manuals[i]);
		}
	}
	status.manuals = to_keep;
}

/**
 * Fait le ménage dans les programmations. date est optionnel.
 */
function manuals_clear(date) {
	var instant;
	if (date === undefined) {
		instant = Date.now();
	} else {
		instant = date.getTime();
	}

	var res = undefined;
	var remaining = [];
	for (var i = 0; i < status.manuals.length; i++) {
		if (status.manuals[i].to_utc <= instant) {
			// Ne sera plus jamais concernée, ne pas garder
		} else {
			// Garder, en cours ou dans le futur
			remaining.push(status.manuals[i]);
		}
	}
	status.manuals = remaining;
}

// -- Programs ----------------------------------------------------------------

/**
 * Recherche le mode de fonctionnement pour une zone dans un programme donné à
 * un instant précis. On prend celui par défaut, ensuite on passe toutes les
 * règles. Si plusieures règles correspondent, on prend la plus confortable.
 * 
 * Ne prend pas en charge les règles temporaires.
 * 
 * Renvoi 4 si rien de trouvé.
 */
function programs_get(program_id, zone_id, instant) {
	var program = config.programs[program_id];
	if (program == undefined) {
		console.error("warning: Invalid program: " + program_id);
		return 4;
	}

	if (instant == undefined) {
		instant = new Date();
	}

	var program = config.programs[program_id];
	var res = undefined;
	for (var i = 0; i < program.rules.length; i++) {
		var rule = program.rules[i];
		var day = instant.getDay();
		// Est-ce que la zone est dans la règle ?
		var isZoneInRule = false;
		for (var j = 0; j < rule.zones.length; j++) {
			if (rule.zones[j] == zone_id) {
				isZoneInRule = true;
				break;
			}
		}
		if (!isZoneInRule) {
			continue;
		}

		// Est-ce que le jour est dans la règle ?
		var isDayInRule = false;
		for (var j = 0; j < rule.days.length; j++) {
			if (rule.days[j] % 7 == day) {
				isDayInRule = true;
				break;
			}
		}
		if (!isDayInRule) {
			continue;
		}

		// Est-ce qu'on est dans le bon horaire ?
		var isInTimePeriod = false;
		var minutes = instant.getHours() * 60 + instant.getMinutes();
		if (rule.from <= minutes && minutes < rule.to) {
			isInTimePeriod = true;
		}
		if (!isInTimePeriod) {
			continue;
		}

		// On prend la règle la plus confortable
		if (res === undefined || res < rule.mode) {
			res = rule.mode;
		}
	}

	// On n'a pas trouvé, on prend la valeur par défaut
	if (res === undefined) {
		res = program.defaults[zone_id];
	}
	// Préventif, si on n'a pas de valeur par défaut
	if (res === undefined) {
		return 4;
	}
	return res;
}

// -- GPIO --------------------------------------------------------------------

// Chargement du module gpio pour le Raspberry Pi (optionnel)
var gpio = undefined;
try {
	gpio = require("gpio");
} catch (e) {
	console.error("error: Unable to load module gpio");
}

/**
 * Initialisation d'une sortie du RPi
 */
function _gpio_open(io) {
	if (gpio === undefined) {
		console.log("gpio: open " + io);
		return;
	} else {
		status.gpio_devices[io] = gpio.export(io, {
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
function _gpio_close(io) {
	if (gpio === undefined) {
		console.log("gpio: close " + io);
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
function _gpio_set(io, value) {
	if (gpio === undefined) {
		console.log("gpio: set " + io + " = " + value);
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
function gpios_open() {
	for ( var i_zone in config.zones) {
		var zone = config.zones[i_zone];
		for ( var i_io in zone.ios) {
			_gpio_open(zone.ios[i_io]);
		}
	}
}

/**
 * Fermeture des GPIOs pour toutes les zones
 */
function gpios_close() {
	for ( var io in status.gpio_devices) {
		_gpio_close(io);
	}
}

/** Met à jour les GPIO du RPi en fonction des modes activés sur les radiateurs */
function gpios_update() {
	for ( var zone_id in config.zones) {
		var zone = config.zones[zone_id];
		var mode = status.zones[zone_id];
		var io0 = zone.ios[0];
		var io1 = zone.ios[1];

		var io0_state = (mode & 1) !== 0 ? 1 : 0;
		var io1_state = (mode & 2) !== 0 ? 1 : 0;

		_gpio_set(io0, io0_state);
		_gpio_set(io1, io1_state);
	}
}

// -- Status ------------------------------------------------------------------

function status_update() {
	for ( var zone_id in config.zones) {
		var mode = manuals_get(zone_id);
		if (mode === undefined) {
			mode = programs_get(status.program, zone_id);
		}
		status.zones[zone_id] = mode;
	}
	gpios_update();
}

// -- MAIN --------------------------------------------------------------------

gpios_open();
status_update();
var update_interval = setInterval(function() {
	status_update();
	manuals_clear();
}, 5000);

var server = app.listen(5000, function() {
	var host = server.address().address
	var port = server.address().port
	console.log('Listening at http://%s:%s', host, port)
});

// clearInterval(update_interval);
// update_interval = undefined;
// gpios_close();
