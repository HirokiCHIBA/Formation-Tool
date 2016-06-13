var WB = function(selector) {
	this.pool = Snap(selector);
	this.poolCanvas = this.pool.select("#pool_canvas");
	this.poolActors = this.poolCanvas.select("#pool_actors");
	this.selectedActors = this.poolCanvas.g();
	this.viewBox = this.pool.attr("viewBox");
	this.setPXOffset();
	this.poolCanvasTransform = Snap.matrix();
	this.$actor_setting = $("#actor_setting");
	this.$actor_name = this.$actor_setting.find("#actor_name");
	this.$color_circle = this.$actor_setting.find("#color_circle");
	this.$color_text = this.$actor_setting.find("#color_text");
	this.sidebarScrolled = 0;
	this.sidebarTouchDraggable = false;
};

WB.prototype.gridX = [-50, 50, 80, 170, 260, 350, 440, 530, 620, 710, 800, 890, 980, 1070, 1160, 1250, 1340, 1430, 1520, 1610, 1700, 1790, 1880, 1970, 2060, 2150, 2240, 2330, 2420, 2450, 2550];
WB.prototype.gridY = [-50, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250, 1300, 1350, 1400, 1450, 1550];
WB.prototype.tolerance = 22.5;
WB.prototype.actorRadius = 45;
WB.prototype.getFormation = "get-formation.php";
WB.prototype.$reloading = $('<div id="reloading"><div id="reloading-container"><span class="loading01"><span></span></span></div></div>');

// SVG描画領域内座標の単位PX数とオフセットを計算
WB.prototype.setPXOffset = function() {
	var $pool = $("#pool");
	var poolw = $pool.width();
	var poolh = $(window).height();
	var pooloffset = $pool.offset();
	var xratio = poolw / this.viewBox.width;
	var yratio = poolh / this.viewBox.height;

	$pool.height(poolh);
	$("#sidebar").height(poolh);

	this.coordinatePX = yratio < xratio ? yratio : xratio;

	var vieww = this.coordinatePX * this.viewBox.width;
	var viewh = this.coordinatePX * this.viewBox.height;

	this.coordinateOffset = {
		x: (poolw - vieww) / 2 + pooloffset.left,
		y: (poolh - viewh) / 2 + pooloffset.top
	}
};

WB.prototype.setColorPicker = function() {
	var palette = [
		["#000","#444","#666","#999","#ccc","#eee","#f3f3f3","#fff"],
		["#f00","#f90","#ff0","#0f0","#0ff","#00f","#90f","#f0f"],
		["#f4cccc","#fce5cd","#fff2cc","#d9ead3","#d0e0e3","#cfe2f3","#d9d2e9","#ead1dc"],
		["#ea9999","#f9cb9c","#ffe599","#b6d7a8","#a2c4c9","#9fc5e8","#b4a7d6","#d5a6bd"],
		["#e06666","#f6b26b","#ffd966","#93c47d","#76a5af","#6fa8dc","#8e7cc3","#c27ba0"],
		["#c00","#e69138","#f1c232","#6aa84f","#45818e","#3d85c6","#674ea7","#a64d79"],
		["#900","#b45f06","#bf9000","#38761d","#134f5c","#0b5394","#351c75","#741b47"],
		["#600","#783f04","#7f6000","#274e13","#0c343d","#073763","#20124d","#4c1130"]
	];

	this.$color_circle.spectrum({
		showPaletteOnly: true,
		showInput: true,
		showAlpha: true,
		togglePaletteOnly: true,
		togglePaletteMoreText: 'more',
		togglePaletteLessText: 'less',
		preferredFormat: "hex",
		allowEmpty: true,
		palette: palette,
		change: (this.changeActorsCircleColor).bind(this)
	});

	this.$color_text.spectrum({
		showPaletteOnly: true,
		showInput: true,
		showAlpha: true,
		togglePaletteOnly: true,
		togglePaletteMoreText: 'more',
		togglePaletteLessText: 'less',
		preferredFormat: "hex",
		allowEmpty: true,
		palette: palette,
		change: (this.changeActorsTextColor).bind(this)
	});

	this.$actor_name.on("change keydown blur", (function() {
		this.changeActorName();
	}).bind(this));
};

WB.prototype.changeActorName = function() {
	var actors = this.selectedActors.selectAll("g.actor");

	actors.forEach(function(actor) {
		var beforeText = actor.select("text");
		var beforeTextFill = beforeText.attr("fill");
		beforeText.remove();
		actor.text(0, 0, this.$actor_name.val()).attr("fill", beforeTextFill);
	}, this);
};

WB.prototype.changeActorsCircleColor = function() {
	var actorsCircle = this.selectedActors.selectAll("g.actor circle");

	actorsCircle.forEach(function(circle) {
		circle.attr("fill", this.$color_circle.val());
	}, this);
};

WB.prototype.changeActorsTextColor = function() {
	var actorsText = this.selectedActors.selectAll("g.actor text");

	actorsText.forEach(function(text) {
		text.attr("fill", this.$color_text.val());
	}, this);
};

WB.prototype.setActorEditForm = function() {
	var actors = this.selectedActors.selectAll("g.actor");

	if (actors.length === 1) {
		this.$actor_name.removeAttr("placeholder");
		this.$actor_name.val(actors[0].select("text").innerSVG());
		this.$color_circle.spectrum("set", actors[0].select("circle").attr("fill"));
		this.$color_text.spectrum("set", actors[0].select("text").attr("fill"));
	} else if (actors.length > 1) {
		this.$actor_name.attr("placeholder", "複数編集");
		this.$actor_name.val("");
		this.$color_circle.spectrum("set", "");
		this.$color_text.spectrum("set", "");
	} else {
		this.$actor_name.removeAttr("placeholder");
		this.$actor_name.val("");
		this.$color_circle.spectrum("set", "");
		this.$color_text.spectrum("set", "");
	}
};

// Actorをフォーカス
WB.prototype.focusActor = function(actor) {
	this.selectedActors.append(actor);

	actor.data("focus", "true");

	actor.select("circle").attr({
		filter: this.pool.filter(Snap.filter.shadow(0, 0, 10, "#000099"))
	});
};

// Actorをフォーカスアウト
WB.prototype.focusoutActor = function(actor) {
	this.poolActors.append(actor);

	actor.removeData("focus");

	actor.select("circle").attr({
		filter: ""
	});
};

// すべてのActorをフォーカスアウト
WB.prototype.focusoutAllActors = function() {
	var actors = this.selectedActors.selectAll("g.actor");

	actors.forEach(function(actor) {
		this.focusoutActor(actor);
	}, this);
};

// フォーカスしたActorをドラッグ(開始)
WB.prototype.dragStartActors = function() {
	var actors = this.selectedActors.selectAll("g.actor");

	actors.forEach(function(actor) {
		actor.data("origin", actor.transform().localMatrix.split());
	}, this);
};

// フォーカスしたActorをドラッグ(移動)
WB.prototype.dragMoveActors = function(dx, dy) {
	var actors = this.selectedActors.selectAll("g.actor");

	actors.forEach(function(actor) {
		var origin = actor.data("origin");
		var odx = this.poolCanvasTransform.x(origin.dx, origin.dy);
		var ody = this.poolCanvasTransform.y(origin.dx, origin.dy);
		var x = odx + dx / this.coordinatePX;
		var y = ody + dy / this.coordinatePX;
		var invert = this.poolCanvasTransform.clone().invert();
		var tx = invert.x(x, y);
		var ty = invert.y(x, y);
		var trans = Snap.matrix().translate(Snap.snapTo(this.gridX, tx, this.tolerance), Snap.snapTo(this.gridY, ty, this.tolerance));
		actor.transform(trans);
	}, this);
};

// フォーカスしたActorを削除
WB.prototype.removeActor = function() {
	var actors = this.selectedActors.selectAll("g.actor");

	actors.forEach(function(actor) {
		actor.remove();
	}, this);
};

// Actorタップ時のフォーカスの振る舞い
WB.prototype.focusBehavior = function(actor, event) {
	if (typeof actor.data("focus") === "undefined") {
		if (event.metaKey) {
			this.focusActor(actor);
		} else {
			this.focusoutAllActors();
			this.focusActor(actor);
		}
	} else {
		if (event.metaKey) {
			this.focusoutActor(actor);
		} else {
			this.focusActor(actor);
		}
	}
};

WB.prototype.addActorEvent = function(actor) {
	actor.drag((function(dx, dy, x, y, e) {
		if (e.type == 'touchmove' && e.originalEvent.touches.length > 1) return;
		this.dragMoveActors(dx, dy);
	}).bind(this), (function(x, y, e) {
		e.stopPropagation();
		this.focusBehavior(actor, e);
		this.dragStartActors();
	}).bind(this), (function() {
		this.setActorEditForm();
	}).bind(this));

	actor.click((function(e) {
		e.stopPropagation();
		this.focusBehavior(actor, e);
		this.setActorEditForm();
	}).bind(this));
};

// 指定した座標のActorの有無を調査
WB.prototype.checkOverlap = function(x, y) {
	var trans = Snap.matrix().translate(x, y).toString();
	var actor = this.poolActors.select('g.actor[transform="' + trans + '"]') || this.selectedActors.select('g.actor[transform="' + trans + '"]') || false;

	return actor;
};

// 新規Actorの生成
WB.prototype.putNewActor = function(x, y, id, name) {
	var ax, ay;

	if (typeof x === "undefined" || typeof y === "undefined") {
		search:
		for (var i = 0; i <= 30; i+=30) {
			for (var j = 2; j <= 28; j++) {
				if (!this.checkOverlap(this.gridX[j], this.gridY[i]))
					break search;
			}
		}
		if (i > 30 || j > 28)
			return;
		else {
			ax = this.gridX[j];
			ay = this.gridY[i];
		}
	} else {
		ax = x;
		ay = y;
	}

	var aid = id || "";
	var aname = name || "";
	var circle = this.poolActors.circle(0, 0, this.actorRadius).attr({fill: "#ff9900"});
	var text = this.poolActors.text(0, 0, aname).attr({fill: "#000000"});
	var actor = this.poolActors.g(circle, text);
	var trans = Snap.matrix().translate(ax, ay);

	actor.addClass("actor").transform(trans).attr("id", "actor-" + id);

	this.focusoutAllActors();
	this.focusActor(actor);
	this.addActorEvent(actor);
	this.setActorEditForm();
};

// Actorの操作イベントを登録
WB.prototype.actorsEventRegistration = function() {
	var actors = this.poolActors.selectAll("g.actor");

	actors.forEach(function(actor) {
		this.addActorEvent(actor);
	}, this);
};

// Pool上の操作イベントを登録
WB.prototype.poolEventResistration = function() {
	this.pool.click((function() {
		this.focusoutAllActors();
	}).bind(this));

	var selectArea;
	var metaKey;
	var startx, starty;
	var movex, movey;
	var panzoom = false;

	this.pool.drag((function(dx, dy, x, y, e) {
		if (e.type == 'touchmove' && e.originalEvent.touches.length > 1) return;
		movex = dx / this.coordinatePX;
		movey = dy / this.coordinatePX;
		selectArea.attr({
			d: "M" + startx + "," + starty + "h" + movex + "v" + movey + "h" + (- movex) + "z"
		});
	}).bind(this), (function(x, y, e) {
		if (e.type == 'touchstart' && e.originalEvent.touches.length > 1) return;
		var ex = e.pageX || x;
		var ey = e.pageY || y;
		movex = 0;
		movey = 0;
		metaKey = e.metaKey
		startx = (ex - this.coordinateOffset.x) / this.coordinatePX + this.viewBox.x;
		starty = (ey - this.coordinateOffset.y) / this.coordinatePX + this.viewBox.y;
		selectArea = this.pool.path().addClass("select_area");
		panzoom = false;
	}).bind(this), (function(e) {
		if (!panzoom) {
			var x1, x2, y2, y3;
			if (movex > 0) {
				x1 = startx;
				x2 = startx + movex;
			} else {
				x1 = startx + movex;
				x2 = startx;
			}
			if (movey > 0) {
				y1 = starty;
				y2 = starty + movey;
			} else {
				y1 = starty + movey;
				y2 = starty;
			}
			var invert = this.poolCanvasTransform.clone().invert();
			var tx1 = invert.x(x1, y1);
			var ty1 = invert.y(x1, y1);
			var tx2 = invert.x(x2, y2);
			var ty2 = invert.y(x2, y2);
			if (!metaKey)
				this.focusoutAllActors();
			this.poolActors.selectAll("g.actor").forEach(function(actor) {
				var trans = actor.transform().localMatrix.split();
				if (tx1 < trans.dx && trans.dx < tx2 && ty1 < trans.dy && trans.dy < ty2)
					this.focusActor(actor);
			}, this);
		}
		wb.pool.selectAll("path.select_area").forEach(function(sa) {
			sa.remove();
		});
		this.setActorEditForm();
	}).bind(this));

	var wb = this;
	this.pool.touchstart(function(e) {
		if (e.type != 'touchstart' && e.type != 'touchmove' && e.type != 'touchend') return;
		if (e.touches.length != 2) return;
		var originalX = (e.pageX - wb.coordinateOffset.x) / wb.coordinatePX + wb.viewBox.x;
		var originalY = (e.pageY - wb.coordinateOffset.y) / wb.coordinatePX + wb.viewBox.y;
		var invert = wb.poolCanvasTransform.clone().invert();
		var transX = invert.x(originalX, originalY);
		var transY = invert.y(originalX, originalY);
		var originalDistance = Math.pow(Math.pow(e.touches[0].pageX - e.touches[1].pageX, 2)
					+ Math.pow(e.touches[0].pageY - e.touches[1].pageY, 2), 1 / 2);
		var transform = wb.poolCanvasTransform.clone();
		this.touchmove(function(e) {
			if (e.touches.length != 2) return;
			var currentX = (e.pageX - wb.coordinateOffset.x) / wb.coordinatePX + wb.viewBox.x;
			var currentY = (e.pageY - wb.coordinateOffset.y) / wb.coordinatePX + wb.viewBox.y;
			var invert = wb.poolCanvasTransform.clone().invert();
			var ctransX = invert.x(currentX, currentY) - transX;
			var ctransY = invert.y(currentX, currentY) - transY;
			var currentDistance = Math.pow(Math.pow(e.touches[0].pageX - e.touches[1].pageX, 2)
						+ Math.pow(e.touches[0].pageY - e.touches[1].pageY, 2), 1 / 2);
			var scale = currentDistance / originalDistance;
			transform = wb.poolCanvasTransform.clone().translate(ctransX, ctransY).scale(scale, scale, transX, transY);
			wb.poolCanvas.transform(transform);
			$('#reset_zoom').removeClass('hidden');
			panzoom = true;
			wb.pool.selectAll("path.select_area").forEach(function(sa) {
				sa.remove();
			});
		});
		this.touchend(function(e) {
			this.untouchmove();
			this.untouchend();
			wb.poolCanvasTransform = transform;
		});
	});
};

WB.prototype.resetZoom = function(e) {
	e.stopImmediatePropagation();
	this.poolCanvasTransform = Snap.matrix();
	this.poolCanvas.transform(this.poolCanvasTransform);
	$('#reset_zoom').addClass('hidden');
}

$(function() {
	var wb = new WB("#pool");

	wb.poolEventResistration();

	wb.setColorPicker();

	$("#actor_control a").click(function(e) {
		e.preventDefault();
	});

	$("#actor_add").on({
		tap: function() {
			wb.putNewActor();
		}
	});

	$("#actor_rmv").on({
		tap: function() {
			wb.removeActor();
		}
	});

	$('#reset_zoom').on('tap', function(e) {
		wb.resetZoom(e);
	});

	$('#close_editor').on('tap', function(e) {
		e.stopImmediatePropagation();
		$('#actor_control').addClass('hidden');
	});

	$('#open_editor').on('tap', function(e) {
		e.stopImmediatePropagation();
		$('#actor_control').removeClass('hidden');
	})

	$(window).on("orientationchange resize", function() {
		wb.setPXOffset();
	});
});