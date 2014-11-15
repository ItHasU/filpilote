// -- Constants ---------------------------------------------------------------

var MODES_HTML = {
	4 : '<i class="glyphicon glyphicon-fire"></i>&nbsp;Confort',
	3 : '<i class="glyphicon glyphicon-euro"></i>&nbsp;Economique',
	2 : '<i class="glyphicon glyphicon-briefcase"></i>&nbsp;Hors-gel',
	1 : '<i class="glyphicon glyphicon-off"></i>&nbsp;Eteint',
};
var DAYS_HTML = [ "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi",
		"Vendredi", "Samedi" ];

// -- Globals -----------------------------------------------------------------

var config = undefined;

// -- Tools -------------------------------------------------------------------

function time2string(instant) {
	if (instant == undefined) {
		instant = new Date();
	}
	var res = "";
	res += DAYS_HTML[instant.getDay()] + " ";
	res += instant.getDate() + "/" + instant.getMonth() + "/"
			+ instant.getYear();
	var minutes = instant.getHours() * 60 + instant.getMinutes();
	res += " - " + minutes2string(minutes);
	return res;
}

function minutes2string(minutes) {
	return Math.floor(minutes / 60) + ":" + ((minutes % 60) < 10 ? "0" : "")
			+ (minutes % 60);
}

function router_page(page_id) {
	try {
		if (page_id[0] != "#") {
			page_id = "#" + page_id.split("#")[1];
		}
	} catch (e) {
		console.log(e);
	}

	// On cache tout
	$("body > .container").hide();
	// On affiche la page
	$(page_id).show();
	// On cache le menu
	$('#navbar-collapse-main').collapse('hide');
}

// -- Init --------------------------------------------------------------------

function reset() {
	config = undefined;
	router_page("#not_connected");

	// -- Dashboard --
	$("#template-dashboard-zone .render").remove();
	// -- Calendars --
	// TODO
	// -- Programmes --
	// TODO
}

/**
 * Bind les interactions et initialise la page
 */
function init() {
	$('#navbar-collapse-main').collapse({
		'toggle' : false
	});

	// -- Gestion des liens entre pages --
	$("a[href^='#']").click(function() {
		router_page($(this).prop("href"));
	});

	// -- Page debug --
	$("#debug_refresh").click(debug);

	// -- Initialisation de la page --
	reset();
	$.get("/api/config", _init_cb);
}

function _init_cb(data) {
	config = data;

	// -- Dashboard : Zones --
	for ( var i in config.zones) {
		var zone = config.zones[i];
		// Création du rendu à partir du template
		var template = zone.elt = $("#template-dashboard-zone .template")
				.clone();
		template.removeClass("template").addClass("render");
		// Mise à jour de la zone
		template.find(".template-dashboard-name").html(zone.name);
		$("#template-dashboard-zone").append(template);
	}
	router_page("#main");
	refresh();
}

function refresh() {
	// -- Dashboard : Mise à jour de la date --
	$("#dashboard-date").html(time2string());

	// -- Dashboard : Récupération des status --
	$.get("/api/status", function(data) {
		_refresh_cb(data);
	}).error(function() {
		reset();
	});
}

function _refresh_cb(status) {
	// -- MAJ programme --
	var program = config.programs[status.program];
	if (program == undefined) {
		// On a besoin de rafraîchir la page car on ne connait pas le programme
		reset();
		return;
	}
	$("#dashboard-program").html(program.name);

	// -- Mise à jours des zones --
	for ( var zone_id in config.zones) {
		var zone = config.zones[zone_id];
		var mode = status.zones[zone_id]
		if (zone == undefined) {
			// On a besoin de rafraîchir la page car la zone est inconnue
			reset();
			return;
		}
		var template = zone.elt;
		template.find(".template-dashboard-mode").html(MODES_HTML[mode]);
	}
}

function debug() {
	$.get("/api/debug").success(
			function(data) {
				$("#debug_settings").html(
						"<pre>" + JSON.stringify(data, null, 2) + "</pre>");
			});
}

// -- Script ------------------------------------------------------------------

$(document).ready(function() {
	init();
	setInterval(function() {
		refresh();
	}, 2000);
});
