// -- Constants ---------------------------------------------------------------

var MODES_HTML = {
	4 : '<i class="glyphicon glyphicon-fire"></i>&nbsp;Confort',
	3 : '<i class="glyphicon glyphicon-euro"></i>&nbsp;Economique',
	2 : '<i class="glyphicon glyphicon-briefcase"></i>&nbsp;Hors-gel',
	1 : '<i class="glyphicon glyphicon-off"></i>&nbsp;Eteint',
};
var DAYS_HTML = [ "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi",
		"Vendredi", "Samedi" ];
var DAYS_SHORT_HTML = [ "Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam." ];

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

	// -- Rules : Programs --
	for ( var i in config.programs) {
		var program = config.programs[i];
		var template_main = $("#rule-program-template.template").clone();
		template_main.removeClass("template").addClass("render");
		// Mise à jour du nom
		template_main.find(".rule-program-name").html(program.name);
		// Mise à jour des modes par défaut
		for ( var j in program.defaults) {
			var zone_name = config.zones[j].name;
			var zone_mode = MODES_HTML[program.defaults[j]];

			var template_default = template_main.find(
					"#rule-default-template.template").clone();
			template_default.removeClass("template").addClass("render");

			template_default.find(".rule-default-zone").html(zone_name);
			template_default.find(".rule-default-mode").html(zone_mode);

			template_main.find("#rule-defaults").append(template_default);
		}
		// Mise à jour des règles
		for (var j = 0; j < program.rules.length; j++) {
			var rule = program.rules[j];

			var days = "";
			for (var k = 0; k < rule.days.length; k++) {
				if (days != "") {
					days += ", ";
				}
				days += DAYS_SHORT_HTML[rule.days[k] % 7];
			}
			var from = minutes2string(rule.from);
			var to = minutes2string(rule.to);
			var zones = "";
			for (var k = 0; k < rule.zones.length; k++) {
				if (zones != "") {
					zones += ", ";
				}
				zones += config.zones[rule.zones[k]].name;
			}
			var mode = MODES_HTML[rule.mode];

			var template_item = template_main.find(
					"#rule-item-template.template").clone();
			template_item.removeClass("template").addClass("render");

			template_item.find(".rule-item-days").html(days);
			template_item.find(".rule-item-from").html(from);
			template_item.find(".rule-item-to").html(to);
			template_item.find(".rule-item-zone").html(zones);
			template_item.find(".rule-item-mode").html(mode);

			template_main.find("#rule-items").append(template_item);
		}
		// On ajoute l'élément
		$("#rule-programs").append(template_main);
	}

	router_page("#main");
	refresh();
}

function refresh() {
	// -- Dashboard : Mise à jour de la date --
	$("#dashboard-date").html(time2string());

	// -- Dashboard : Récupération des status --
	$.get("/api/status", function(data) {
		_refresh_cb_dashboard(data);
	}).error(function() {
		reset();
	});
}

function _refresh_cb_dashboard(status) {
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
			(function(id) {
				template.find(".template-dashboard-remove").click(function() {
					var api_url = "/api/manual/cancel/" + id;
					$.get(api_url, function() {
						refresh();
					});
				});
			})(manual.id);

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
