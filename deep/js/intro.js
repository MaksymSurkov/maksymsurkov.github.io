(function () {
	"use strict";

	var root = document.documentElement;
	var css = window.getComputedStyle(root);
	var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	function cssTime(name, fallback) {
		var raw = css.getPropertyValue(name).trim();
		var n = parseFloat(raw);
		if (!raw || isNaN(n)) return fallback;
		return /ms$/.test(raw) ? n : n * 1000;
	}

	function splitWords(el) {
		if (!el) return;

		var parts = el.textContent.trim().split(/\s+/);
		el.textContent = "";

		parts.forEach(function (word, i) {
			var outer = document.createElement("span");
			outer.className = "word";
			outer.style.setProperty("--i", i);

			var inner = document.createElement("span");
			inner.className = "word__in";
			inner.textContent = word;

			outer.appendChild(inner);
			el.appendChild(outer);
			if (i < parts.length - 1) {
				el.appendChild(document.createTextNode(" "));
			}
		});
	}

	splitWords(document.querySelector(".main__title"));
	splitWords(document.querySelector(".about__title"));
	splitWords(document.querySelector(".services__title"));
	splitWords(document.querySelector(".portfolio__title"));
	splitWords(document.querySelector(".team__title"));

	function unpinned(fn) {
		var saved = [];

		Array.prototype.forEach.call(
			document.querySelectorAll(".page__section, .page, .footer"),
			function (el) {
				if (window.getComputedStyle(el).position !== "sticky") return;
				saved.push([el, el.style.top]);
				el.style.top = "auto";
			}
		);

		try {
			return fn();
		} finally {
			saved.forEach(function (pair) { pair[0].style.top = pair[1]; });
		}
	}

	function docTop(el) {
		var t = 0;
		while (el) {
			t += el.offsetTop;
			el = el.offsetParent;
		}
		return t;
	}

	function fitStickySections() {
		var vh = window.innerHeight;

		Array.prototype.forEach.call(
			document.querySelectorAll(".page__section, .page, .footer"),
			function (el) {
				if (window.getComputedStyle(el).position !== "sticky") {
					el.style.top = "";
					return;
				}

				var h = el.offsetHeight;
				el.style.top = (h > vh ? vh - h : 0) + "px";
			}
		);
	}

	function indexAll(list) {
		Array.prototype.forEach.call(list, function (el, i) {
			el.style.setProperty("--i", i);
		});
	}

	indexAll(document.querySelectorAll(".services__item"));
	indexAll(document.querySelectorAll(".portfolio__item"));
	indexAll(document.querySelectorAll(".item-team"));

	function startLogoInk() {
		var header = document.querySelector(".header");
		var mark = document.querySelector(".header__mark");
		if (!header || !mark) return;

		var markTop = 0; // constant: the header is fixed
		var markH = 0;
		var zones = [];
		var lastA = null;
		var lastB = null;
		var wasScrolled = null;
		var raf = null;

		function measure() {
			var r = mark.getBoundingClientRect();
			markTop = r.top;
			markH = r.height;

			zones = [];
			unpinned(function () {
				Array.prototype.forEach.call(
					document.querySelectorAll("[data-bg]"),
					function (el) {
						if (el.getAttribute("data-bg") !== "dark") return;
						var top = docTop(el);
						zones.push({ top: top, bottom: top + el.offsetHeight });
					}
				);
			});
			zones.sort(function (x, y) { return x.top - y.top; });
		}

		function apply() {
			raf = null;

			var sy = window.scrollY;

			var scrolled = sy > 24;
			if (scrolled !== wasScrolled) {
				wasScrolled = scrolled;
				header.classList.toggle("is-scrolled", scrolled);
			}

			var logoTop = sy + markTop;
			var logoBottom = logoTop + markH;
			var from = null;
			var to = null;

			for (var i = 0; i < zones.length; i++) {
				var s0 = Math.max(zones[i].top, logoTop);
				var e0 = Math.min(zones[i].bottom, logoBottom);
				if (e0 <= s0) continue;
				if (from === null || s0 < from) from = s0;
				if (to === null || e0 > to) to = e0;
			}

			var insetTop = from === null ? markH : from - logoTop;
			var insetBottom = from === null ? 0 : logoBottom - to;

			if (insetTop === lastA && insetBottom === lastB) return;
			lastA = insetTop;
			lastB = insetBottom;

			mark.style.setProperty("--ink-top", insetTop.toFixed(1) + "px");
			mark.style.setProperty("--ink-bottom", insetBottom.toFixed(1) + "px");
		}

		function onScroll() {
			if (raf === null) raf = window.requestAnimationFrame(apply);
		}

		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", function () {
			measure();
			onScroll();
		});

		measure();
		apply();
	}

	function startPortfolioHover() {
		var items = document.querySelectorAll(".portfolio__item");
		if (!items.length) return;

		var EDGE = [
			["101%", "0%"],
			["0%", "101%"],
			["-101%", "0%"],
			["0%", "-101%"]
		];

		function setEdge(el, e) {
			var r = el.getBoundingClientRect();
			var x = (e.clientX - r.left) / r.width - 0.5;
			var y = (e.clientY - r.top) / r.height - 0.5;

			var i = Math.round(Math.atan2(y, x) / (Math.PI / 2));
			if (i < 0) i += 4;

			el.style.setProperty("--edge-x", EDGE[i][0]);
			el.style.setProperty("--edge-y", EDGE[i][1]);
		}

		Array.prototype.forEach.call(items, function (el) {
			el.addEventListener("mouseenter", function (e) { setEdge(el, e); });
			el.addEventListener("mouseleave", function (e) { setEdge(el, e); });
		});
	}

	function revealOnEnter(el, margin) {
		if (!el) return;

		function reveal() {
			el.classList.add("is-in");
		}

		if (!window.IntersectionObserver) {
			reveal();
			return;
		}

		var io = new window.IntersectionObserver(
			function (entries) {
				if (entries[0].isIntersecting) {
					reveal();
					io.disconnect();
				}
			},
			{ rootMargin: margin }
		);

		io.observe(el);
	}

	function startContentReveals() {
		revealOnEnter(document.querySelector(".about"), "0px 0px -50% 0px");

		revealOnEnter(document.querySelector(".services"), "0px 0px -25% 0px");

		revealOnEnter(document.querySelector(".portfolio"), "0px 0px -25% 0px");
		revealOnEnter(document.querySelector(".team"), "0px 0px -25% 0px");
	}

	var rot = document.querySelector(".rotator");
	var words = rot
		? (rot.getAttribute("data-words") || "")
			.split(",")
			.map(function (s) { return s.trim(); })
			.filter(Boolean)
		: [];

	var HOLD = 2800;
	var SWAP = 420;

	function startRotator() {
		if (!rot || reduced || words.length < 2) return;

		var inner = rot.querySelector(".rotator__in");
		var index = 0;

		function tick() {
			if (document.hidden) return;

			inner.classList.add("is-out");

			setTimeout(function () {
				index = (index + 1) % words.length;
				inner.textContent = words[index];

				inner.classList.remove("is-out");
				inner.classList.add("is-next");
				void inner.offsetWidth;
				inner.classList.remove("is-next");
			}, SWAP);
		}

		var settled = cssTime("--intro-end", 2600) + 600;
		setTimeout(function () {
			tick();
			setInterval(tick, HOLD);
		}, settled);
	}

	function startParallax() {
		if (reduced) return;
		if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

		var hero = document.querySelector(".main");
		var box = document.querySelector(".main__image");
		var img = document.querySelector(".main__image img");
		if (!hero || !box || !img) return;

		var OVER = 0.015;
		var maxX = 0, maxY = 0;

		var STIFF = 0.001;
		var DAMP = 0.845;

		var STEP = 1000 / 60;

		var tx = 0, ty = 0; // target
		var cx = 0, cy = 0; // current
		var vx = 0, vy = 0; // velocity
		var raf = null;
		var rect = null;
		var last = 0;
		var acc = 0;

		function measure() {
			rect = hero.getBoundingClientRect();
			var b = box.getBoundingClientRect();
			maxX = b.width * OVER;
			maxY = b.height * OVER;
		}

		function step() {
			vx += (tx - cx) * STIFF;
			vy += (ty - cy) * STIFF;
			vx *= DAMP;
			vy *= DAMP;
			cx += vx;
			cy += vy;
		}

		function frame(now) {
			var dt = now - last;
			last = now;
			if (dt > 100) dt = 100;
			if (dt < 0) dt = 0;
			acc += dt;
			while (acc >= STEP) {
				step();
				acc -= STEP;
			}

			img.style.translate = cx.toFixed(2) + "px " + cy.toFixed(2) + "px";

			var moving =
				Math.abs(tx - cx) > 0.05 ||
				Math.abs(ty - cy) > 0.05 ||
				Math.abs(vx) > 0.01 ||
				Math.abs(vy) > 0.01;

			raf = moving ? window.requestAnimationFrame(frame) : null;
		}

		function run() {
			if (raf === null) {
				last = window.performance.now();
				acc = 0;
				raf = window.requestAnimationFrame(frame);
			}
		}

		hero.addEventListener("mouseenter", measure);
		window.addEventListener("resize", measure);

		hero.addEventListener("mousemove", function (e) {
			if (!rect) measure();

			var nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
			var ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;

			tx = -nx * maxX;
			ty = -ny * maxY;
			run();
		});

		hero.addEventListener("mouseleave", function () {
			tx = 0;
			ty = 0;
			run();
		});

		measure();
	}

	function startSectionReveal() {
		if (reduced) return;
		if (!window.matchMedia("(min-width: 768px)").matches) return;

		var hero = document.querySelector(".main");
		var about = document.querySelector(".about");
		if (!hero || !about) return;

		var footer = document.querySelector(".footer");
		var stack = document.querySelector(".page");
		var media = document.querySelector(".services__media");
		var svcImg = document.querySelector(".services__image");
		var svcPhone = document.querySelector(".services__phone");

		var FROM = 0.78;
		var HERO_BACK = 0.06;
		var HERO_DIM = 0.55;
		var CARD_R = 20;
		var RANGE = 0.8; 

		var SVC_IMG = 75;
		var SVC_PHONE = 120;

		var PH_STIFF = 0.025;
		var PH_DAMP = 0.764;
		var PH_STEP = 1000 / 60;

		var phoneY = 0;
		var phoneV = 0;
		var phoneTo = 0;
		var phoneRaf = null;
		var phoneLast = 0;
		var phoneAcc = 0;

		function phoneFrame(now) {
			var dt = now - phoneLast;
			phoneLast = now;
			if (dt > 100) dt = 100;
			if (dt < 0) dt = 0;
			phoneAcc += dt;

			while (phoneAcc >= PH_STEP) {
				phoneV += (phoneTo - phoneY) * PH_STIFF;
				phoneV *= PH_DAMP;
				phoneY += phoneV;
				phoneAcc -= PH_STEP;
			}

			svcPhone.style.setProperty("--svc-phone", phoneY.toFixed(1) + "px");

			var moving =
				Math.abs(phoneTo - phoneY) > 0.1 || Math.abs(phoneV) > 0.05;
			phoneRaf = moving ? window.requestAnimationFrame(phoneFrame) : null;
		}

		function phoneRun() {
			if (phoneRaf === null) {
				phoneLast = window.performance.now();
				phoneAcc = 0;
				phoneRaf = window.requestAnimationFrame(phoneFrame);
			}
		}

		var raf = null;

		var aboutTop = 0;
		var footerTop = 0;
		var wasCovered = null;
		var wasReceding = null;
		var mediaTop = 0;
		var mediaH = 0;

		function measurePositions() {
			unpinned(function () {
				aboutTop = docTop(about);
				if (footer) footerTop = docTop(footer);
				if (media) {
					mediaTop = docTop(media);
					mediaH = media.offsetHeight;
				}
			});
		}

		function update() {
			raf = null;

			var vh = window.innerHeight;
			var sy = window.scrollY;

			var aboutY = aboutTop - sy;
			var mediaC = mediaTop - sy + mediaH / 2;

			var p = (vh - aboutY) / (vh * RANGE);
			p = p < 0 ? 0 : p > 1 ? 1 : p;

			var e = 1 - Math.pow(1 - p, 3);

			var aboutS = FROM + (1 - FROM) * e;
			var heroS = 1 - HERO_BACK * e;

			var q = (vh / 2 - mediaC) / (vh / 2 + mediaH / 2);
			q = q < -1 ? -1 : q > 1 ? 1 : q;

			about.style.setProperty("--about-s", aboutS.toFixed(4));
			hero.style.setProperty("--hero-s", heroS.toFixed(4));
			hero.style.setProperty("--hero-dim", (HERO_DIM * e).toFixed(3));

			hero.style.setProperty(
				"--hero-r", (CARD_R * e / heroS).toFixed(1) + "px");
			about.style.setProperty(
				"--about-r", (CARD_R * (1 - e) / aboutS).toFixed(1) + "px");

			var covered = sy >= aboutTop;
			if (covered !== wasCovered) {
				wasCovered = covered;
				hero.classList.toggle("is-covered", covered);
			}

			if (footer) {
				var pf = (vh - (footerTop - sy)) / vh;
				pf = pf < 0 ? 0 : pf > 1 ? 1 : pf;

				var ef = 1 - Math.pow(1 - pf, 1.5);
				var footerS = FROM + (1 - FROM) * ef;

				footer.style.setProperty("--footer-s", footerS.toFixed(4));
				footer.style.setProperty(
					"--footer-r", (CARD_R * (1 - ef) / footerS).toFixed(1) + "px");

				if (stack) {
					var receding = ef > 0;
					if (receding !== wasReceding) {
						wasReceding = receding;
						stack.classList.toggle("is-receding", receding);
					}

					var stackS = 1 - HERO_BACK * ef;
					stack.style.setProperty("--stack-s", stackS.toFixed(4));
					stack.style.setProperty("--stack-dim", (HERO_DIM * ef).toFixed(3));
					stack.style.setProperty(
						"--stack-r", (CARD_R * ef / stackS).toFixed(1) + "px");
				}
			}

			if (!media || !svcImg || !svcPhone) return;

			svcImg.style.setProperty("--svc-img", (-q * SVC_IMG).toFixed(1) + "px");

			phoneTo = -q * SVC_PHONE;
			phoneRun();
		}

		function onScroll() {
			if (raf === null) raf = window.requestAnimationFrame(update);
		}

		function onResize() {
			measurePositions();
			onScroll();
		}

		if (window.ResizeObserver) {
			var ro = new window.ResizeObserver(function () {
				measurePositions();
				onScroll();
			});
			ro.observe(document.body);
		}

		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onResize);

		measurePositions();
		update();
	}

	
	function start() {
		requestAnimationFrame(function () {
			root.classList.add("is-ready");
			startRotator();
			startSectionReveal();
			startContentReveals();
			startLogoInk();
			startPortfolioHover();

			fitStickySections();
			window.addEventListener("resize", fitStickySections);

			window.addEventListener("load", function () {
				fitStickySections();
				window.dispatchEvent(new Event("resize"));
			});

			setTimeout(
				startParallax,
				cssTime("--intro-delay", 300) + cssTime("--intro-curtain", 1500)
			);
		});
	}

	if (document.fonts && document.fonts.ready) {
		Promise.race([
			document.fonts.ready,
			new Promise(function (resolve) { setTimeout(resolve, 900); })
		]).then(start);
	} else {
		start();
	}
})();
