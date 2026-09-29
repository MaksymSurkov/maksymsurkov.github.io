/*=================================================================
  Hero intro.

  - splits the headline into words so each can rise from a mask
  - flips <html> to .is-ready once the real fonts are in, which is
    what actually starts every transition in css/intro.css
  - cycles the last word of "We're Creative"

  Timings live in css/intro.css. This file reads --intro-end from
  there rather than repeating a number, so retuning the CSS is
  enough.

  Safe to delete: remove this file plus the <link>, <script> and the
  .rotator span in index.html.
=================================================================*/
(function () {
	"use strict";

	var root = document.documentElement;
	var css = window.getComputedStyle(root);
	var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	/* read a CSS time token as milliseconds */
	function cssTime(name, fallback) {
		var raw = css.getPropertyValue(name).trim();
		var n = parseFloat(raw);
		if (!raw || isNaN(n)) return fallback;
		return /ms$/.test(raw) ? n : n * 1000;
	}

	/*--- one masked span per word, for either headline ---------- */
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

	/*--- measuring around sticky --------------------------------
	  offsetTop on a pinned sticky element reports where it has been
	  shifted to, not where it sits in the layout. Reload part way
	  down the page and .main comes back claiming its top is the
	  scroll position itself, which drags every zone with it — the
	  logo then reads a white section as dark and turns white on
	  white.

	  Unpinning for the length of the measurement gives the real
	  numbers back. top: auto rather than position: static, so the
	  elements stay positioned and the offsetParent chain being
	  walked does not change underneath it.
	------------------------------------------------------------ */
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

	/*--- layout position, immune to transforms ------------------
	  offsetTop is layout-based, so unlike getBoundingClientRect it
	  is not moved by a transform on the element being measured.
	------------------------------------------------------------ */
	function docTop(el) {
		var t = 0;
		while (el) {
			t += el.offsetTop;
			el = el.offsetParent;
		}
		return t;
	}

	/*--- sticky sections taller than the viewport ---------------
	  A section pinned at top: 0 that is taller than the viewport can
	  never show its lower part: it pins by its top edge and holds
	  there, so everything past the fold inside it is unreachable by
	  scrolling. .contacts trips this on most laptops — the map alone
	  is 617px on top of 282px of padding, against a working window
	  height nearer 780px.

	  Pinning such a section by its BOTTOM instead fixes it: a
	  negative top lets it keep scrolling until its last line is on
	  screen, and only then does it hold. Sections that already fit
	  keep top: 0 and are untouched.
	------------------------------------------------------------ */
	function fitStickySections() {
		var vh = window.innerHeight;

		Array.prototype.forEach.call(
			document.querySelectorAll(".page__section, .page, .footer"),
			function (el) {
				// below 768px nothing is sticky, and .about/.services
				// are never sticky at any width — skip whatever the
				// cascade says is not pinned
				if (window.getComputedStyle(el).position !== "sticky") {
					el.style.top = "";
					return;
				}

				var h = el.offsetHeight;
				el.style.top = (h > vh ? vh - h : 0) + "px";
			}
		);
	}

	/*--- index a list so CSS can stagger it -------------------- */
	function indexAll(list) {
		Array.prototype.forEach.call(list, function (el, i) {
			el.style.setProperty("--i", i);
		});
	}

	indexAll(document.querySelectorAll(".services__item"));
	indexAll(document.querySelectorAll(".portfolio__item"));
	indexAll(document.querySelectorAll(".item-team"));

	/*--- logo colour follows what is under it -------------------
	  One threshold is enough. Under the logo the hero is purple and
	  .about's left half is navy, so both want a white logo; from
	  .services down every section is white on the left and wants a
	  dark one. So the switch is simply "has .services reached the
	  logo".

	  No layout read on scroll: the boundary is measured once.
	------------------------------------------------------------ */
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

		// Every element that declares what the logo sits on, in
		// document coordinates. Nothing here knows which section is
		// which — recolour one, flip its data-bg, and this follows.
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

			// frosted backdrop: off over the hero, on once moving
			var scrolled = sy > 24;
			if (scrolled !== wasScrolled) {
				wasScrolled = scrolled;
				header.classList.toggle("is-scrolled", scrolled);
			}

			// the stretch of the logo that is currently over a dark
			// background, as insets from its top and bottom edges
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

	/*--- portfolio: the fill follows the pointer ----------------
	  Which edge the cursor crossed decides where the overlay grows
	  from, and where it collapses back to on the way out. The card
	  is normalised to a square first — measuring the angle on the
	  raw 300x405 box would bias every diagonal toward the long
	  sides and call a corner entry "top" when it was really "left".
	------------------------------------------------------------ */
	function startPortfolioHover() {
		var items = document.querySelectorAll(".portfolio__item");
		if (!items.length) return;

		// 0 right, 1 bottom, 2 left, 3 top — the panel waits just
		// outside the edge the pointer is on
		// 101%, not 100% — see the note on --edge-y in css/intro.css
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

	/*--- play a section's copy once, when it comes into view -----
	  Deliberately not driven off scroll progress: about is already
	  making a large scroll-linked move, and hanging the copy on the
	  same progress would put its speed in the wheel's hands and make
	  it stutter on a hard flick. A class fires it once and it then
	  runs on its own clock.
	------------------------------------------------------------ */
	function revealOnEnter(el, margin) {
		if (!el) return;

		function reveal() {
			el.classList.add("is-in");
		}

		// without IntersectionObserver the copy would stay hidden for
		// good, so show it rather than animate it
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
		// about's card is already ~99% grown by the time its top
		// reaches mid-screen — the ease-out spends most of its travel
		// early — so the copy can start there without racing it
		revealOnEnter(document.querySelector(".about"), "0px 0px -50% 0px");

		// services is not a card — it travels with about in normal
		// flow — so it fires as it comes into view instead
		revealOnEnter(document.querySelector(".services"), "0px 0px -25% 0px");

		// portfolio travels in the same flow, same threshold
		revealOnEnter(document.querySelector(".portfolio"), "0px 0px -25% 0px");
		revealOnEnter(document.querySelector(".team"), "0px 0px -25% 0px");
	}

	/*--- rotating word ------------------------------------------ */
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

				// park the new word below the mask with no transition,
				// force the jump to land, then let it rise
				inner.classList.remove("is-out");
				inner.classList.add("is-next");
				void inner.offsetWidth;
				inner.classList.remove("is-next");
			}, SWAP);
		}

		// The CSS timeline starts when .is-ready lands, not when this
		// file parses — so this is scheduled from there, not from load.
		var settled = cssTime("--intro-end", 2600) + 600;
		setTimeout(function () {
			tick();
			setInterval(tick, HOLD);
		}, settled);
	}

	/*--- mouse parallax on the hero photo -----------------------
	  Follows the cursor lazily rather than tracking it exactly: the
	  target is set on mousemove, and a rAF loop eases the current
	  position towards it. The loop stops itself once it has settled
	  so an idle page burns no frames.
	------------------------------------------------------------ */
	function startParallax() {
		if (reduced) return;
		if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

		var hero = document.querySelector(".main");
		var box = document.querySelector(".main__image");
		var img = document.querySelector(".main__image img");
		if (!hero || !box || !img) return;

		// Travel as a share of the photo's own box, not a pixel count.
		// Fixed pixels are wrong twice over: 6px on an 845px-wide photo
		// is 0.7% of it and simply cannot be seen, and the same 6px is
		// a completely different gesture on a box half the width.
		// CSS scales the photo to 1.10, leaving 5% of overscan a side;
		// taking 3.5% keeps ~1.4x of margin at every viewport width.
		var OVER = 0.015;
		var maxX = 0, maxY = 0;

		// A spring, not a lerp.
		//
		// A lerp moves fastest the instant it starts and does nothing
		// but decelerate from there — it cannot drift, and it leaves a
		// long dead tail where it is technically still moving but not
		// visibly. A spring accelerates into the move, lags behind a
		// fast flick and then pours into place.
		//
		// Damping ratio ~0.82: 90% of the distance in ~1.5s, settled by
		// ~2.0s, overshooting 1%. The overshoot is the whole trick —
		// it glides a hair past and eases back instead of stopping
		// dead on the mark.
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

			// Integrated at a fixed 60Hz step regardless of how often
			// the browser paints. With a raw per-frame factor the photo
			// settles twice as fast on a 120Hz screen as on a 60Hz one
			// — the same numbers, a different feel per machine.
			// Clamped so returning to a backgrounded tab does not
			// fast-forward the spring through hundreds of steps.
			// clamp both ends: >100ms is a return from a background
			// tab, and a negative dt (the rAF timestamp predating the
			// performance.now() that seeded it) would drive the
			// accumulator below zero and freeze the spring for
			// several frames before it lurched forward
			if (dt > 100) dt = 100;
			if (dt < 0) dt = 0;
			acc += dt;
			while (acc >= STEP) {
				step();
				acc -= STEP;
			}

			img.style.translate = cx.toFixed(2) + "px " + cy.toFixed(2) + "px";

			// velocity has to be checked too: at the top of an overshoot
			// the photo sits on its target for an instant while still
			// carrying speed, and a position-only test would stop there
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

		// measured on entry, not on every move — reading the rect in a
		// mousemove handler forces a layout on each event
		hero.addEventListener("mouseenter", measure);
		window.addEventListener("resize", measure);

		hero.addEventListener("mousemove", function (e) {
			if (!rect) measure();

			// -1..1 out from the centre of the hero
			var nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
			var ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;

			// against the cursor, so the photo reads as sitting behind
			// the page rather than stuck to the mouse
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

	/*--- .about grows in, hero dissolves ------------------------
	  Progress is measured off .about's own top edge: 0 when it sits
	  at the bottom of the viewport, 1 once it has climbed 80% of a
	  viewport height. It then sticks at the top, where the reading
	  stays pinned at 1.
	------------------------------------------------------------ */
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

		var FROM = 0.78;      // .about's starting scale
		var HERO_BACK = 0.06; // how far the hero recedes
		var HERO_DIM = 0.55;  // how deep into shadow it goes
		var CARD_R = 20;      // px of corner, as actually seen
		var RANGE = 0.8;      // finished after 80% of a viewport height

		// services parallax: px of drift either side of neutral. The
		// phone travels further than the laptop because it sits on
		// top of it — in a parallax the nearer thing moves more, and
		// that difference is the whole depth cue. Same direction for
		// both, or they would drift apart and the phone would slide
		// off the laptop it is meant to be resting on.
		// Sized against the 166px of padding .services__media carries
		// above and below the laptop: that is the room available
		// before an image would climb off the purple pane.
		//
		// These have to be far bigger than they look. The section
		// takes ~1800px of scrolling to cross the screen, so 18px of
		// drift worked out at 2px per 100px scrolled — real, and
		// completely invisible. 45 puts it at 5px per 100px.
		var SVC_IMG = 75;    // laptop: tied straight to the scroll
		var SVC_PHONE = 120; // phone: same idea, but it trails

		// The phone does not track the scroll. It is pulled towards
		// where the scroll says it should be, and gets there late —
		// so it visibly hangs back while you are moving and arrives a
		// beat after you stop. That lag is the effect; the difference
		// in amplitude alone only ever read as one rigid block.
		//
		// damping ratio 0.85: ~0.30s to close the gap, settled by
		// 0.36s, 2% of overshoot so it eases in rather than stopping
		// dead on the mark.
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
			// clamp both ends: >100ms is a return from a background
			// tab, and a negative dt (the rAF timestamp predating the
			// performance.now() that seeded it) would drive the
			// accumulator below zero and freeze the spring for
			// several frames before it lurched forward
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

		// Runs on its own clock, not on scroll events: the phone has
		// to keep closing the gap after the scrolling has stopped.
		function phoneRun() {
			if (phoneRaf === null) {
				phoneLast = window.performance.now();
				phoneAcc = 0;
				phoneRaf = window.requestAnimationFrame(phoneFrame);
			}
		}

		var raf = null;

		// Layout positions, measured once rather than every frame.
		//
		// getBoundingClientRect() on .about was wrong twice over. It
		// reports the box AFTER transform, and .about is the very
		// element this function scales — so the measurement fed on the
		// scale set last frame, and the scale fed back on the
		// measurement. At 0.78 that is a 77px error in where the
		// section is believed to be, drifting between frames and
		// depending on scroll history rather than on scroll position.
		// offsetTop is layout-based; transforms never touch it.
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

			// --- every read first ---------------------------------
			// Reads and writes were interleaved here, and each write
			// dirties style, so the read that followed forced a
			// synchronous layout — once per scroll frame.
			var vh = window.innerHeight;
			var sy = window.scrollY;

			var aboutY = aboutTop - sy;
			var mediaC = mediaTop - sy + mediaH / 2;

			// --- then the arithmetic ------------------------------
			var p = (vh - aboutY) / (vh * RANGE);
			p = p < 0 ? 0 : p > 1 ? 1 : p;

			// ease-out: most of the growth happens as it comes into
			// view, then it settles instead of arriving at full speed
			var e = 1 - Math.pow(1 - p, 3);

			// one comes forward, the other goes back — opposing
			// directions are what make the two layers legible
			var aboutS = FROM + (1 - FROM) * e;
			var heroS = 1 - HERO_BACK * e;

			// -1 when the media block's centre is at the bottom of the
			// viewport, +1 when it is at the top
			var q = (vh / 2 - mediaC) / (vh / 2 + mediaH / 2);
			q = q < -1 ? -1 : q > 1 ? 1 : q;

			// --- then every write ---------------------------------
			about.style.setProperty("--about-s", aboutS.toFixed(4));
			hero.style.setProperty("--hero-s", heroS.toFixed(4));
			hero.style.setProperty("--hero-dim", (HERO_DIM * e).toFixed(3));

			// border-radius is applied before the transform, so a plain
			// 20px paints as 20 x scale — 15.6px on .about at 0.78 next
			// to 18.8px on the hero at 0.94. Dividing the scale back out
			// makes CARD_R the radius actually seen, equal on both.
			hero.style.setProperty(
				"--hero-r", (CARD_R * e / heroS).toFixed(1) + "px");
			about.style.setProperty(
				"--about-r", (CARD_R * (1 - e) / aboutS).toFixed(1) + "px");

			// the hero is pinned all the way down the page, so it has to
			// stop painting once the stack covers it — otherwise it
			// shows through the gap the receding stack opens up
			var covered = sy >= aboutTop;
			if (covered !== wasCovered) {
				wasCovered = covered;
				hero.classList.toggle("is-covered", covered);
			}

			// The footer arrives as a card, but on a gentler curve than
			// .about. The cubic ease-out spends itself almost entirely
			// before the element is on screen: at RANGE 0.8 the footer
			// was already at 0.996 with half of it still below the
			// fold, so there was no card to see. A full viewport of
			// travel and a soft power make the growth visible.
			if (footer) {
				var pf = (vh - (footerTop - sy)) / vh;
				pf = pf < 0 ? 0 : pf > 1 ? 1 : pf;

				var ef = 1 - Math.pow(1 - pf, 1.5);
				var footerS = FROM + (1 - FROM) * ef;

				footer.style.setProperty("--footer-s", footerS.toFixed(4));
				footer.style.setProperty(
					"--footer-r", (CARD_R * (1 - ef) / footerS).toFixed(1) + "px");

				// and the stack goes back under it, mirroring what the
				// hero does under .about.
				//
				// The class carries the cost: without it .page would
				// hold a transform, a clip-path and a full-height
				// overlay for the whole scroll, on a 4338px box, to
				// serve an effect that only runs at the very end.
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

			// the laptop is pinned to the scroll position
			svcImg.style.setProperty("--svc-img", (-q * SVC_IMG).toFixed(1) + "px");

			// the phone only gets a new target; the spring above walks
			// it there in its own time
			phoneTo = -q * SVC_PHONE;
			phoneRun();
		}

		// rAF-throttled: scroll fires far more often than the screen
		// paints, and update() reads layout
		function onScroll() {
			if (raf === null) raf = window.requestAnimationFrame(update);
		}

		function onResize() {
			measurePositions();
			onScroll();
		}

		// Positions are cached, so anything that changes layout after
		// the measurement leaves them stale — a late webfont swap, an
		// image settling, the reveal classes landing. resize alone does
		// not catch those.
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

	/*--- start only once the webfonts are in, otherwise the words
	      reflow halfway through their own animation -------------- */
	function start() {
		requestAnimationFrame(function () {
			root.classList.add("is-ready");
			startRotator();
			startSectionReveal();
			startContentReveals();
			startLogoInk();
			startPortfolioHover();

			// after webfonts, since they change how tall the copy is
			fitStickySections();
			window.addEventListener("resize", fitStickySections);

			// the browser restores scroll on reload, and may do it
			// after this runs — nudge everything once more on load
			window.addEventListener("load", function () {
				fitStickySections();
				window.dispatchEvent(new Event("resize"));
			});

			// armed once the panel has stopped resizing the photo's box
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
