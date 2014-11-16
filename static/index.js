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
			+ (1900 + instant.getYear());
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

// -- Bind --------------------------------------------------------------------

function bind_manual(zone_id, e) {
	var minutes_str = e.attr("data-minutes");
	if (minutes_str == undefined) {
		return;
	}
	e.click(function() {
		var url = "/api/manual/" + zone_id + "/" + 4 + "/" + minutes_str;
		$.get(url, function() {
			// Only refresh once returned
			refresh();
		});
	});
}

// -- Init --------------------------------------------------------------------

function reset() {
	config = undefined;
	router_page("#not_connected");

	// -- Dashboard --
	$("#template-dashboard-zone .render").remove();
	$("#template-dashboard-manual .render").remove();
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
		// Bind des minuteurs
		template.find("a[data-minutes]").each(function(j, e) {
			bind_manual(i, $(e));
		});
		// On ne change pas le mode, c'est le status qui fera ça
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

	// -- Mise à jours des "manuels" --
	$("#template-dashboard-manual .render").remove();
	if (status.manuals.length) {
		$("#panel-dashboard-manual").show();
		for (var i = 0; i < status.manuals.length; i++) {
			var manual = status.manuals[i];
			// Création du rendu à partir du template
			var template = $("#template-dashboard-manual .template").clone();
			template.removeClass("template").addClass("render");
			// Mise à jour de la ligne
			template.find(".template-dashboard-zone").html(
					config.zones[manual.zone].name);
			template.find(".template-dashboard-mode").html(
					MODES_HTML[manual.mode]);
			template.find(".template-dashboard-from").html(
					time2string(new Date(manual.from_utc)));
			template.find(".template-dashboard-to").html(
					time2string(new Date(manual.to_utc)));

			// On ne change pas le mode, c'est le status qui fera ça
			$("#template-dashboard-manual").append(template);
		}
	} else {
		$("#panel-dashboard-manual").hide();
	}
}

function debug() {
	$.get("/api/status").success(
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
