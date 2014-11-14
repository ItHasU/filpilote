var Controller = function() {
	this.zones = {}
	this.mode_str = [ "normal", "zero", "freeze", "eco" ];
};

Controller.prototype.init = function() {
	var that = this;
	$('#navbar-collapse-main').collapse({
		'toggle' : false
	});

	// Chargement de la page principale
	this.loadPage("#main");

	// -- Binding des actions --
	// Menu principal (pages)
	$("a[href^='#']").click(function() {
		that.loadPage($(this).prop("href"));
	});
	// Page debug
	$("#debug_refresh").click(function() {
		that.debug_settings();
	});

	this.refresh(true);

	$("#debug_test_post").click(
			function() {
				var zone_id = $("#debug_test_post_zone").val();
				var value = $("#debug_test_post_value").val();

				$.post("/api/zone/" + zone_id + "/" + value).success(
						function(data) {
							$("#debug_test_post_result").html(
									"<pre>" + JSON.stringify(data, null, 2)
											+ "</pre>");
						});
			});
}

Controller.prototype.refresh = function(create) {
	var that = this;
	$.get("/api/zones", function(data) {
		that.refresh_cb(data, create);
	});
}

Controller.prototype.bind_button = function(elt, zone_id, mode) {
	var that = this;
	elt.click(function() {
		that.set_mode(zone_id, mode);
	});
}

Controller.prototype.set_mode = function(zone_id, mode) {
	var that = this;
	$.post("/api/zone/" + zone_id + "/" + mode).success(function(data) {
		that.refresh(false);
	});
}

Controller.prototype.refresh_cb = function(data, create) {
	if (create) {
		this.zones = data;
		$("#template-dashboard-zone .render").remove();
	}
	for ( var i in this.zones) {
		var template = null;
		var zone = this.zones[i];
		if (create) {
			// Recherche du template et récupération des données
			zone.elt = template = $("#template-dashboard-zone").clone();
			// Mise à jour de la zone
			template.find(".zone").addClass("zone-" + i);
			template.removeClass("template");
			// Bind des interactions
			var buttons = template.find(".btn");
			var modes = [ 0, 3, 2, 1 ];
			for (var j = 0; j < 4; j++) {
				this.bind_button($(buttons[j]), i, modes[j]);
			}
			// Insertion de l'élément
			$("#dashboard-zones").append(template);
		} else {
			this.zones[i].mode = data[i].mode;
			template = this.zones[i].elt;
		}
		// Mise à jour du mode
		template.find(".mode").removeClass("active");
		template.find(".mode-" + this.mode_str[zone.mode]).addClass("active");
	}
}

Controller.prototype.debug_settings = function() {
	$.get("/api/debug").success(
			function(data) {
				$("#debug_settings").html(
						"<pre>" + JSON.stringify(data, null, 2) + "</pre>");
			});
}

Controller.prototype.loadPage = function(page_id) {
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

var myController = null;
$(document).ready(function() {
	myController = new Controller();
	myController.init();
	setInterval(function() {
		myController.refresh();
	}, 1000);
});
