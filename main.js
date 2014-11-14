var express = require('express')
var app = express()

// Static files
app.use(express.static('static', {
	dotfiles : 'ignore',
	index : "index.html",
	redirect : false,
}));

// -- Controller --------------------------------------------------------------

/*
 * Configuration (à l'arrache, directement dans le fichier). Sera modifiée
 * dynamiquement pour prendre en compte le mode courant
 */
var config = {
	"modes" : {
		0 : "Normal",
		3 : "Economique",
		2 : "Hors-gel",
		1 : "Eteint"
	},
	"zones" : {
		/*
		 * 1: { "name": "Salon", "mode": 0, "ios" : [4, 17] },
		 */
		2 : {
			"name" : "Chambres",
			"mode" : 0,
			"ios" : [ 27, 22 ]
		},
		3 : {
			"name" : "Salles de bains",
			"mode" : 0,
			"ios" : [ 23, 24 ]
		}
	},
	"programs" : {
		"standard" : [ {
			"days" : [ 0, 1, 2, 3, 4, 5, 6 ],
			"begin" : 0,
			"end" : 1440,
			"mode" : 0
		} ]
	}
};

// -- API : Informations sur les zones ----------------------------------------

app.get("/api/zones", function(req, res) {
	res.send(config.zones);
});

// -- API : Debug -------------------------------------------------------------

app.get("/api/debug", function(req, res) {
	res.send(handler.gpio_devices_debug);
});

// -- API : Changement de zone ------------------------------------------------

app.post("/api/zone/:zone/:mode", function(req, res) {
	try {
		var zone_id = req.params.zone;
		var mode = parseInt(req.params.mode);
		if (config.zones[zone_id] !== undefined) {
			if (config.modes[mode] !== undefined) {
				config.zones[zone_id].mode = mode;
				res.send({
					"msg" : "success"
				});
			} else {
				res.send({
					"msg:" : "error: invalid mode (" + mode + ")"
				});
			}
		} else {
			res.send({
				"msg" : "error: invalid zone (" + zone_id + ")"
			});
		}
		handler.update();
	} catch (e) {
		res.send({
			"msg" : e
		});
	}
});

// -- GPIO --------------------------------------------------------------------

var GPIOHandler = function() {
//	this.gpio = require("gpio");
//	this.gpio.logging = true;
	this.gpio_devices = {};
	this.gpio_devices_debug = {};
}

/** Initialisation d'une sortie du RPi */
GPIOHandler.prototype._init_gpio = function(io) {
	var self = this;
	this.gpio_devices[io] = this.gpio.export(io, {
		direction : "out",
		ready : function() {
			// Un vilain hack pour gérer un bug
			setTimeout(function() {
				self.gpio_devices[io].setDirection("out");
			}, 100);
		}
	});
}

/** Initialisation des GPIOs du RPi */
GPIOHandler.prototype.enable = function() {
	for ( var i_zone in config.zones) {
		var zone = config.zones[i_zone];
		for ( var i_io in zone.ios) {
			var io = zone.ios[i_io];
			this._init_gpio(io);
		}
	}
}

/** Désactivation de toutes les GPIOs du RPi */
GPIOHandler.prototype.disable = function() {
	for ( var io in this.gpio_devices) {
		var dev = this.gpio_devices[io];
		dev.removeAllListeners();
		dev.reset();
		dev.unexport();
	}
}

/** Met à jour les GPIO du RPi en fonction des modes activés sur les radiateurs */
GPIOHandler.prototype.update = function() {
	for ( var i_zone in config.zones) {
		var zone = config.zones[i_zone];

		var io0 = zone.ios[0];
		var io1 = zone.ios[1];

		var io0_state = (zone.mode & 1) !== 0 ? 1 : 0;
		var io1_state = (zone.mode & 2) !== 0 ? 1 : 0;

		if (this.gpio_devices[io0] !== undefined) {
			this.gpio_devices[io0].set(io0_state);
		}
		if (this.gpio_devices[io1] !== undefined) {
			this.gpio_devices[io1].set(io1_state);
		}
		this.gpio_devices_debug[io0] = io0_state;
		this.gpio_devices_debug[io1] = io1_state;
	}
}

// -- MAIN --------------------------------------------------------------------

var handler = new GPIOHandler();
// handler.enable();
// var update_interval = setInterval(function() {
// handler.update();
// }, 500);

var server = app.listen(5000, function() {
	var host = server.address().address
	var port = server.address().port
	console.log('Listening at http://%s:%s', host, port)
});

// handler.disable();
// clearInterval(update_interval);
// update_interval = undefined;
