/**
 * EGEX Network — Main Script v2.0
 * Scroll reveal, staggered animations, header behavior, mobile menu
 */

(function() {
	'use strict';

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

	function init() {
		setupNavigation();
		setupScrollReveal();
		setupHeaderScroll();
		setupMobileMenu();
		syncCanvasColors();
		console.log('EGEX Network v2.0 initialized');
	}

	/**
	 * Navigation — highlight active page
	 */
	function setupNavigation() {
		var links = document.querySelectorAll('.main-menu a');
		var currentUrl = window.location.pathname;

		links.forEach(function(link) {
			var href = link.getAttribute('href');
			if (currentUrl === href || currentUrl.includes(href.replace('.html', ''))) {
				link.classList.add('active');
			} else {
				link.classList.remove('active');
			}
		});
	}

	/**
	 * Scroll Reveal — IntersectionObserver triggers fade-up on [data-animate] and cards
	 */
	function setupScrollReveal() {
		if (!('IntersectionObserver' in window)) return;

		var observerOptions = {
			threshold: 0.08,
			rootMargin: '0px 0px -60px 0px'
		};

		// Observer for data-animate / auto-detected elements (adds .visible)
		var observer = new IntersectionObserver(function(entries) {
			entries.forEach(function(entry) {
				if (entry.isIntersecting) {
					entry.target.classList.add('visible');
					observer.unobserve(entry.target);
				}
			});
		}, observerOptions);

		// Observer for Strider .animation-element elements (adds .in-view)
		var striderObserver = new IntersectionObserver(function(entries) {
			entries.forEach(function(entry) {
				if (entry.isIntersecting) {
					entry.target.classList.add('in-view');
					striderObserver.unobserve(entry.target);
				}
			});
		}, observerOptions);

		// Observe elements with data-animate attribute
		var animateEls = document.querySelectorAll('[data-animate]');
		animateEls.forEach(function(el) {
			el.classList.add('animate-on-scroll');
			observer.observe(el);
		});

		// Observe .fade-in elements (used by all section templates)
		var fadeEls = document.querySelectorAll('.fade-in');
		fadeEls.forEach(function(el) {
			observer.observe(el);
		});

		// Also observe sections, cards, feature-cards
		var contentEls = document.querySelectorAll('.section, .feature-card, .card, .garden-feature-card, .loe-card, .partnership-card, .post-item, .content-section, .stat-box, .contest-hero');
		contentEls.forEach(function(el) {
			if (!el.hasAttribute('data-animate')) {
				el.classList.add('animate-on-scroll');
				observer.observe(el);
			}
		});

		// Observe Strider animation elements
		var striderEls = document.querySelectorAll('.animation-element');
		striderEls.forEach(function(el) {
			striderObserver.observe(el);
		});

		// Staggered card entrance
		staggerCards();
	}

	/**
	 * Staggered Card Entrance — delay each card's animation
	 */
	function staggerCards() {
		var grids = document.querySelectorAll('.features-grid, .card-grid, .garden-features-grid, .loe-grid, .partnership-grid');

		grids.forEach(function(grid) {
			var cards = grid.children;
			for (var i = 0; i < cards.length; i++) {
				cards[i].style.transitionDelay = (i * 60) + 'ms';
			}
		});
	}

	/**
	 * Header Scroll — add .scrolled class on scroll for darker backdrop
	 */
	function setupHeaderScroll() {
		var header = document.querySelector('.site-header');
		if (!header) return;

		var scrollThreshold = 40;
		var ticking = false;

		function onScroll() {
			if (!ticking) {
				requestAnimationFrame(function() {
					if (window.scrollY > scrollThreshold) {
						header.classList.add('scrolled');
					} else {
						header.classList.remove('scrolled');
					}
					ticking = false;
				});
				ticking = true;
			}
		}

		window.addEventListener('scroll', onScroll, { passive: true });
	}

	/**
	 * Mobile Menu — hamburger toggle
	 */
	function setupMobileMenu() {
		var toggle = document.querySelector('.menu-toggle');
		var menu = document.querySelector('.main-menu');
		if (!toggle || !menu) return;

		toggle.addEventListener('click', function() {
			toggle.classList.toggle('active');
			menu.classList.toggle('open');
		});

		// Close menu on link click
		menu.querySelectorAll('a').forEach(function(link) {
			link.addEventListener('click', function() {
				toggle.classList.remove('active');
				menu.classList.remove('open');
			});
		});

		// Close on escape
		document.addEventListener('keydown', function(e) {
			if (e.key === 'Escape' && menu.classList.contains('open')) {
				toggle.classList.remove('active');
				menu.classList.remove('open');
			}
		});
	}

	/**
	 * Canvas Color Sync — update Hemi-Synch visualization to use CSS variable colors
	 */
	function syncCanvasColors() {
		var root = getComputedStyle(document.documentElement);
		var primary = root.getPropertyValue('--color-primary').trim();
		var resonance = root.getPropertyValue('--color-resonance').trim();

		// Expose to global scope for canvas scripts to read
		window.EGEX_COLORS = {
			primary: primary || '#22c55e',
			primaryDim: root.getPropertyValue('--color-primary-dim').trim() || '#16a34a',
			resonance: resonance || '#a855f7',
			bg: root.getPropertyValue('--color-bg').trim() || '#0a0e17',
			surface: root.getPropertyValue('--color-surface').trim() || '#111827',
			text: root.getPropertyValue('--color-text').trim() || '#e2e8f0',
			textMuted: root.getPropertyValue('--color-text-muted').trim() || '#94a3b8'
		};
	}

	/**
	 * Modal Animation Hook
	 */
	window.openModal = function(id) {
		var overlay = document.getElementById(id);
		if (overlay) {
			overlay.classList.add('active');
			document.body.style.overflow = 'hidden';
		}
	};

	window.closeModal = function(id) {
		var overlay = document.getElementById(id);
		if (overlay) {
			overlay.classList.remove('active');
			document.body.style.overflow = '';
		}
	};

	// Close modal on overlay click
	document.addEventListener('click', function(e) {
		if (e.target.classList.contains('modal-overlay')) {
			e.target.classList.remove('active');
			document.body.style.overflow = '';
		}
	});

})();
