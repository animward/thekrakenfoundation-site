/**
 * EGEX Network — nerve.js
 * Sensor grid payload. Runs on all 23 EGEX domains.
 * Telemetry | Heartbeat | Cross-Site Pings | Nav Graph | Tripwire
 * Debug: __NERVE.status() | __NERVE.exportJSON() | __NERVE.clearEvents()
 */
(function () {
  'use strict';

  var STORAGE_KEY = '_egex_nerve';
  var MAX_EVENTS = 500;
  var HEARTBEAT_MS = 60000;
  var MANIFEST_PATH = 'nerve-manifest.json';
  var CANARY_FILE = '_canary.png';
  var CNAME_PATH = 'CNAME';
  var VERSION = '1.0.0';

  // --- Utilities ---

  function now() { return new Date().toISOString(); }

  function loadEvents() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function saveEvents(events) {
    // FIFO: keep last MAX_EVENTS
    if (events.length > MAX_EVENTS) {
      events = events.slice(events.length - MAX_EVENTS);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (e) { /* storage full — silent */ }
  }

  function pushEvent(type, data) {
    var events = loadEvents();
    var evt = { t: now(), type: type, d: data || {} };
    events.push(evt);
    saveEvents(events);
    bridgeGA4(type, data);
    return evt;
  }

  // --- GA4 Bridge (optional) ---

  function bridgeGA4(type, data) {
    if (typeof window.gtag !== 'function') return;
    try {
      window.gtag('event', 'nerve_' + type, {
        nerve_domain: location.hostname,
        nerve_data: JSON.stringify(data || {}).substring(0, 100)
      });
    } catch (e) { /* silent */ }
  }

  // --- Manifest ---

  var manifest = null;

  function loadManifest(cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', MANIFEST_PATH, true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          manifest = JSON.parse(xhr.responseText);
          cb(null, manifest);
        } catch (e) { cb(e); }
      } else { cb(new Error('manifest ' + xhr.status)); }
    };
    xhr.onerror = function () { cb(new Error('manifest network error')); };
    xhr.send();
  }

  // --- 1. Visitor Telemetry ---

  function collectTelemetry() {
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    pushEvent('pageview', {
      path: location.pathname + location.search,
      ref: document.referrer || null,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: screen.width + 'x' + screen.height,
      lang: navigator.language,
      conn: conn ? (conn.effectiveType || conn.type || null) : null,
      dpr: window.devicePixelRatio || 1
    });
  }

  // --- 2. Heartbeat ---

  var heartbeatStart = Date.now();

  function heartbeat() {
    pushEvent('heartbeat', {
      uptime: Math.round((Date.now() - heartbeatStart) / 1000),
      vis: document.visibilityState
    });
  }

  // --- 3. Cross-Site Pings ---

  function pingSiblings(siblings) {
    if (!siblings || !siblings.length) return;
    siblings.forEach(function (domain) {
      var url = 'https://' + domain + '/' + CANARY_FILE + '?_=' + Date.now();
      var img = new Image();
      var start = Date.now();
      img.onload = function () {
        pushEvent('sibling_alive', {
          domain: domain,
          ms: Date.now() - start
        });
      };
      img.onerror = function () {
        pushEvent('sibling_dead', {
          domain: domain,
          ms: Date.now() - start
        });
      };
      img.src = url;
    });
  }

  // --- 4. Navigation Graph ---

  function checkNavEdge() {
    if (!document.referrer) return;
    try {
      var refHost = new URL(document.referrer).hostname;
      var selfHost = location.hostname;
      if (refHost !== selfHost && manifest && manifest.network) {
        var isEgex = manifest.network.some(function (d) {
          return d === refHost;
        });
        if (isEgex) {
          pushEvent('nav_edge', {
            from: refHost,
            to: selfHost
          });
        }
      }
    } catch (e) { /* invalid referrer URL — ignore */ }
  }

  // --- 5. Tripwire ---

  function checkTripwire() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', CNAME_PATH + '?_=' + Date.now(), true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        var cname = (xhr.responseText || '').trim();
        var host = location.hostname;
        if (cname === host) {
          pushEvent('tripwire_ok', { cname: cname });
        } else {
          pushEvent('tripwire_mismatch', {
            expected: cname,
            actual: host
          });
          // Visible alert for mismatch
          console.warn('[NERVE] TRIPWIRE MISMATCH — CNAME:', cname, '| Host:', host);
        }
      } else if (xhr.status === 404) {
        pushEvent('tripwire_no_cname', { status: 404 });
      }
    };
    xhr.onerror = function () {
      pushEvent('tripwire_error', { msg: 'network' });
    };
    xhr.send();
  }

  // --- Boot Sequence ---

  function boot() {
    // Telemetry first
    collectTelemetry();

    // Load manifest, then ping + nav + tripwire
    loadManifest(function (err, m) {
      if (err) {
        pushEvent('manifest_error', { msg: err.message });
        // Still run tripwire without manifest
        checkTripwire();
        return;
      }

      pushEvent('manifest_loaded', {
        self: m.selfDomain,
        siblings: m.siblings ? m.siblings.length : 0,
        network: m.network ? m.network.length : 0
      });

      // Cross-site pings
      pingSiblings(m.siblings);

      // Nav graph
      checkNavEdge();

      // Tripwire
      checkTripwire();
    });

    // Heartbeat interval
    setInterval(heartbeat, HEARTBEAT_MS);
  }

  // --- Debug Console API ---

  window.__NERVE = {
    version: VERSION,

    status: function () {
      var events = loadEvents();
      var types = {};
      events.forEach(function (e) {
        types[e.type] = (types[e.type] || 0) + 1;
      });
      return {
        version: VERSION,
        domain: location.hostname,
        events: events.length,
        types: types,
        manifest: manifest ? {
          self: manifest.selfDomain,
          siblings: manifest.siblings || [],
          networkSize: manifest.network ? manifest.network.length : 0
        } : null,
        uptime: Math.round((Date.now() - heartbeatStart) / 1000) + 's'
      };
    },

    exportJSON: function () {
      return JSON.stringify({
        domain: location.hostname,
        exported: now(),
        version: VERSION,
        events: loadEvents()
      }, null, 2);
    },

    clearEvents: function () {
      localStorage.removeItem(STORAGE_KEY);
      return 'Cleared.';
    },

    ping: function (domain) {
      pingSiblings([domain]);
      return 'Pinging ' + domain + '...';
    }
  };

  // --- Init ---

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
