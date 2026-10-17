/* =====================================================================
   BusGo — shared logic for BOTH pages (index.html = passengers,
   driver.html = drivers).  Plain JavaScript. No build step, no server.

   Everything is saved in the browser's localStorage under ONE key,
   "busgo:reports".  Both pages read and write that same key, so a
   driver's tap shows up on a passenger's map (on the same device, or
   on any device if this is ever given a real backend).

   The rules that came out of the 6 Sep 2026 depot interviews live here:
     - there is NO reward of any kind for reporting (driver 9)
     - a pothole only COUNTS once it is verified (driver 9)
     - a driver report is one tap, and only while the bus is stopped
       (driver 6 — the lock itself is in driver.html)
   ===================================================================== */

window.BusGo = (function () {
  'use strict';

  /* ---------- 1. Constants you can explain in one breath ---------- */

  var KEY_REPORTS = 'busgo:reports';          // the one storage key for reports
  var KEY_ASSIST  = 'busgo:assist-requests';  // boarding-help requests (passenger page)
  var KEY_DEVICE  = 'busgo:device';           // a random id for this phone/browser

  var CLUSTER_M      = 40;   // two reports closer than 40 m are "the same pothole"
  var DEVICES_NEEDED = 3;    // this many DIFFERENT devices must agree before it counts

  var SPEED_LOCK_MS  = 1.4;  // metres per second (~5 km/h). Above this = "bus is moving"

  /* The one route in the prototype: TSRTC 219K, Secunderabad → Miyapur. */
  var ROUTE = {
    name: '219K',
    from: 'Secunderabad',
    to: 'Miyapur',
    stops: [
      { name: 'Secunderabad Bus Stand',   lat: 17.4374, lng: 78.4983 },
      { name: 'Paradise Circle',          lat: 17.4437, lng: 78.4880 },
      { name: 'Begumpet',                 lat: 17.4438, lng: 78.4673 },
      { name: 'Ameerpet X Roads',         lat: 17.4375, lng: 78.4482 },
      { name: 'SR Nagar',                 lat: 17.4409, lng: 78.4344 },
      { name: 'Erragadda',                lat: 17.4468, lng: 78.4249 },
      { name: 'BHEL Bus Stop',            lat: 17.4485, lng: 78.4082 },
      { name: 'Moosapet',                 lat: 17.4502, lng: 78.3991 },
      { name: 'Balanagar',                lat: 17.4538, lng: 78.3871 },
      { name: 'Kukatpally Housing Board', lat: 17.4574, lng: 78.3724 },
      { name: 'JNTU',                     lat: 17.4931, lng: 78.3910 },
      { name: 'Miyapur',                  lat: 17.4960, lng: 78.3559 }
    ]
  };

  /* Report types. Drivers get only the first two (one tap each). */
  var TYPES = {
    pothole:      { label: 'Pothole',          short: 'Pothole' },
    blocked:      { label: 'Road blocked',     short: 'Blocked' },
    waterlogging: { label: 'Waterlogging',     short: 'Water' },
    other:        { label: 'Other road issue', short: 'Other' }
  };

  /* ---------- 2. Seed data — SAMPLE reports so the map is not empty ----------
     These are invented examples, clearly marked seed:true and shown as
     "sample" in the UI. They never claim to be real GHMC data.
     Each one has its own fake device id so the verification rule can be
     demonstrated: some spots are confirmed, some are not.              */

  var SAMPLE_PHOTO = 'data:image/jpeg;base64,' + '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';

  var SEED = [
    /* Ameerpet, near the signal — 3 different devices → CONFIRMED */
    { id: 's1', seed: true, type: 'pothole', lat: 17.4410, lng: 78.4440, device: 'seed-a', source: 'passenger', loc: 'gps', photo: null, ts: 1757130000000, note: 'Deep one before the signal' },
    { id: 's2', seed: true, type: 'pothole', lat: 17.4411, lng: 78.4442, device: 'seed-b', source: 'driver',    loc: 'gps', photo: null, ts: 1757133600000, note: '' },
    { id: 's3', seed: true, type: 'pothole', lat: 17.4409, lng: 78.4439, device: 'seed-c', source: 'passenger', loc: 'map', photo: null, ts: 1757140800000, note: 'Still there' },

    /* SR Nagar flyover — ONE report, but photo taken at GPS position → CONFIRMED */
    { id: 's4', seed: true, type: 'pothole', lat: 17.4409, lng: 78.4344, device: 'seed-d', source: 'passenger', loc: 'gps', photo: SAMPLE_PHOTO, ts: 1757220000000, note: 'Edge of the flyover ramp' },

    /* Erragadda — 2 devices → UNVERIFIED, 2 of 3 (your own report makes it 3) */
    { id: 's5', seed: true, type: 'pothole', lat: 17.4468, lng: 78.4249, device: 'seed-e', source: 'passenger', loc: 'gps', photo: null, ts: 1757300000000, note: '' },
    { id: 's6', seed: true, type: 'pothole', lat: 17.4470, lng: 78.4251, device: 'seed-f', source: 'driver',    loc: 'gps', photo: null, ts: 1757310000000, note: '' },

    /* Moosapet — 1 device → UNVERIFIED, 1 of 3 */
    { id: 's7', seed: true, type: 'pothole', lat: 17.4502, lng: 78.3991, device: 'seed-g', source: 'passenger', loc: 'map', photo: null, ts: 1757400000000, note: 'Near the bus stop' },

    /* KPHB — waterlogging, 3 devices → CONFIRMED */
    { id: 's8', seed: true, type: 'waterlogging', lat: 17.4574, lng: 78.3724, device: 'seed-h', source: 'passenger', loc: 'gps', photo: null, ts: 1757500000000, note: 'Every time it rains' },
    { id: 's9', seed: true, type: 'waterlogging', lat: 17.4575, lng: 78.3726, device: 'seed-i', source: 'passenger', loc: 'gps', photo: null, ts: 1757503600000, note: '' },
    { id: 's10', seed: true, type: 'waterlogging', lat: 17.4573, lng: 78.3723, device: 'seed-j', source: 'driver', loc: 'gps', photo: null, ts: 1757507200000, note: '' },

    /* Balanagar — one driver tap, road blocked → UNVERIFIED, 1 of 3 */
    { id: 's11', seed: true, type: 'blocked', lat: 17.4538, lng: 78.3871, device: 'seed-k', source: 'driver', loc: 'gps', photo: null, ts: 1757600000000, note: '' }
  ];

  /* ---------- 3. Storage helpers ---------- */

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }   // e.g. storage full or blocked
  }

  /* A random id for THIS browser. "Independent reports" = different ids. */
  function deviceId() {
    var id = null;
    try { id = localStorage.getItem(KEY_DEVICE); } catch (e) {}
    if (!id) {
      id = 'dev-' + Math.random().toString(36).slice(2, 10);
      try { localStorage.setItem(KEY_DEVICE, id); } catch (e) {}
    }
    return id;
  }

  function localReports()  { return readJSON(KEY_REPORTS, []); }
  function allReports()    { return SEED.concat(localReports()); }

  /* Tell every open page (this tab AND other tabs) that reports changed. */
  function announce() {
    try { window.dispatchEvent(new CustomEvent('busgo:change')); } catch (e) {}
  }

  /* ---------- 4. Adding a report — the ONE reporting flow ----------
     opts = { type, lat, lng, source: 'passenger'|'driver',
              loc: 'gps'|'map'|'stop', photo: dataURL|null, note, device? }
     No reward, no points, no rank. The function just stores one vote. */
  function addReport(opts) {
    var r = {
      id:     'r-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      seed:   false,
      type:   TYPES[opts.type] ? opts.type : 'other',
      lat:    Number(opts.lat),
      lng:    Number(opts.lng),
      device: opts.device || deviceId(),
      source: opts.source === 'driver' ? 'driver' : 'passenger',
      loc:    opts.loc || 'map',
      photo:  opts.photo || null,
      note:   (opts.note || '').slice(0, 200),
      ts:     Date.now()
    };
    var list = localReports();
    list.push(r);
    if (!writeJSON(KEY_REPORTS, list)) {
      /* Storage full? Drop the photo and try once more. */
      r.photo = null;
      writeJSON(KEY_REPORTS, list);
    }
    announce();
    return r;
  }

  /* DEMO ONLY — pretend a different phone reported the same spot.
     Exists so the verification rule can be tested on one laptop.
     It is labelled "demo" wherever it appears in the UI.            */
  function simulateOtherDevice(type, lat, lng) {
    return addReport({
      type: type, lat: lat, lng: lng, source: 'passenger', loc: 'gps',
      note: 'demo: simulated report from another phone',
      device: 'demo-' + Math.random().toString(36).slice(2, 8)
    });
  }

  function resetLocal() {
    try { localStorage.removeItem(KEY_REPORTS); } catch (e) {}
    try { localStorage.removeItem(KEY_ASSIST); } catch (e) {}
    announce();
  }

  /* ---------- 5. Geometry ---------- */

  /* Straight-line distance in metres between two lat/lng points. */
  function distanceM(aLat, aLng, bLat, bLng) {
    var R = 6371000, toRad = Math.PI / 180;
    var dLat = (bLat - aLat) * toRad, dLng = (bLng - aLng) * toRad;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(aLat * toRad) * Math.cos(bLat * toRad) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  function nearestStop(lat, lng) {
    var best = null, bestD = Infinity;
    ROUTE.stops.forEach(function (s) {
      var d = distanceM(lat, lng, s.lat, s.lng);
      if (d < bestD) { bestD = d; best = s; }
    });
    return { stop: best, distanceM: Math.round(bestD) };
  }

  /* ---------- 6. VERIFICATION — the answer to driver 9 ----------
     Reports of the same type within 40 m of each other are grouped
     into one "spot". A spot is CONFIRMED when either:
       (a) at least 3 DIFFERENT devices reported it, or
       (b) at least one report has a photo taken at a GPS position.
     Nothing else counts. Nobody is paid for any of it.                */
  function groupReports(reports) {
    var groups = [];
    reports.slice().sort(function (a, b) { return a.ts - b.ts; }).forEach(function (r) {
      var g = null;
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].type === r.type &&
            distanceM(groups[i].lat, groups[i].lng, r.lat, r.lng) <= CLUSTER_M) { g = groups[i]; break; }
      }
      if (!g) {
        g = { id: 'g' + groups.length, type: r.type, lat: r.lat, lng: r.lng, reports: [], devices: {}, photoAtGps: false, seedOnly: true };
        groups.push(g);
      }
      g.reports.push(r);
      g.devices[r.device] = true;
      if (r.photo && r.loc === 'gps') g.photoAtGps = true;
      if (!r.seed) g.seedOnly = false;
      /* keep the group's position as the average of its reports */
      var n = g.reports.length;
      g.lat = g.reports.reduce(function (s, x) { return s + x.lat; }, 0) / n;
      g.lng = g.reports.reduce(function (s, x) { return s + x.lng; }, 0) / n;
    });
    groups.forEach(function (g) {
      g.deviceCount = Object.keys(g.devices).length;
      g.confirmed   = g.deviceCount >= DEVICES_NEEDED || g.photoAtGps;
      g.reason      = g.photoAtGps ? 'photo at GPS position'
                    : g.confirmed ? g.deviceCount + ' different phones agree'
                    : g.deviceCount + ' of ' + DEVICES_NEEDED + ' phones';
      g.lastTs      = g.reports[g.reports.length - 1].ts;
      g.near        = nearestStop(g.lat, g.lng);
    });
    return groups;
  }

  function spots() { return groupReports(allReports()); }

  /* ---------- 7. Boarding-help requests (passenger page) ----------
     Saved on this device only. Nobody is dispatched — see the
     "open problem" note on that page.                                 */
  function addAssistRequest(req) {
    var list = readJSON(KEY_ASSIST, []);
    list.push({ id: 'a-' + Date.now().toString(36), ts: Date.now(),
                need: req.need, stop: req.stop, when: req.when, note: (req.note || '').slice(0, 200) });
    writeJSON(KEY_ASSIST, list);
    return list;
  }
  function assistRequests() { return readJSON(KEY_ASSIST, []); }

  /* ---------- 8. Listening for changes (this tab and other tabs) ---------- */
  function onChange(cb) {
    window.addEventListener('busgo:change', cb);              // same tab
    window.addEventListener('storage', function (e) {         // other tabs
      if (!e.key || e.key === KEY_REPORTS || e.key === KEY_ASSIST) cb();
    });
  }

  /* ---------- 9. Photo shrinking (so localStorage does not fill up) ---------- */
  function shrinkPhoto(file, maxPx, cb) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      var scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      var c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      cb(c.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = function () { URL.revokeObjectURL(url); cb(null); };
    img.src = url;
  }

  /* ---------- 10. The ONE map (used by the passenger page) ----------
     Draws the 219K route, its stops, every spot (red if confirmed,
     grey if not) and a heat layer built from CONFIRMED spots only.    */
  function makeMap(elId, opts) {
    opts = opts || {};
    var map = L.map(elId, { zoomControl: true, attributionControl: true })
               .setView([17.455, 78.425], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19
    }).addTo(map);

    var route = L.polyline(ROUTE.stops.map(function (s) { return [s.lat, s.lng]; }),
               { color: '#f5a623', weight: 3, opacity: 0.75, dashArray: '8,6' }).addTo(map);
    map.fitBounds(route.getBounds(), { padding: [24, 24], animate: false });

    /* Spot markers get their own pane ABOVE the heat layer, so a red pin is never hidden under a blob. */
    map.createPane('spots');
    map.getPane('spots').style.zIndex = 450;

    ROUTE.stops.forEach(function (s) {
      L.circleMarker([s.lat, s.lng], { radius: 5, color: '#4a90e2', fillColor: '#4a90e2', fillOpacity: 1, weight: 1 })
        .addTo(map).bindPopup('<strong>' + s.name + '</strong><br><span class="muted">219K stop</span>');
    });

    var spotLayer = L.layerGroup().addTo(map);
    var heatLayer = null;

    function refresh() {
      spotLayer.clearLayers();
      if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
      var groups = spots();
      var heatPts = [];
      groups.forEach(function (g) {
        var color = g.confirmed ? '#e74c3c' : '#8a92ad';
        var m = L.circleMarker([g.lat, g.lng], {
          pane: 'spots', radius: g.confirmed ? 9 : 7, color: color, weight: 2,
          fillColor: color, fillOpacity: g.confirmed ? 0.85 : 0.15
        }).addTo(spotLayer);
        var photoHtml = '';
        g.reports.forEach(function (r) {
          if (r.photo && !photoHtml) photoHtml = '<img src="' + r.photo + '" alt="report photo" style="width:100%;max-width:200px;border-radius:6px;margin-top:6px;display:block">';
        });
        m.bindPopup(
          '<strong>' + TYPES[g.type].label + '</strong> · ' + (g.confirmed ? '<span class="ok">Confirmed</span>' : '<span class="muted">Unverified</span>') +
          '<br><span class="muted">' + g.reason + ' · ' + g.reports.length + ' report' + (g.reports.length === 1 ? '' : 's') +
          (g.seedOnly ? ' · sample data' : '') + '</span>' +
          '<br><span class="muted">near ' + g.near.stop.name + ' (' + g.near.distanceM + ' m)</span>' + photoHtml
        );
        if (g.confirmed) heatPts.push([g.lat, g.lng, Math.min(1, 0.4 + 0.2 * g.reports.length)]);
      });
      /* If the map's tab was hidden, Leaflet may still think it is 0 px wide;
         fix that before drawing the heat layer (which needs a real size). */
      var sz = map.getSize();
      if (!sz.x || !sz.y) { map.invalidateSize(); sz = map.getSize(); }
      if (heatPts.length && sz.x && sz.y) {
        if (typeof L.heatLayer === 'function') {
          heatLayer = L.heatLayer(heatPts, { radius: 32, blur: 24, maxZoom: 16, minOpacity: 0.35,
                        gradient: { 0.2: '#f5a623', 0.6: '#ff6b35', 1.0: '#e74c3c' } }).addTo(map);
        } else {
          /* fallback if the heat plugin did not load: translucent circles */
          heatLayer = L.layerGroup(heatPts.map(function (p) {
            return L.circle([p[0], p[1]], { radius: 90, color: 'transparent', fillColor: '#e74c3c', fillOpacity: 0.25 });
          })).addTo(map);
        }
      }
      if (opts.onRefresh) opts.onRefresh(groups);
    }

    /* Call this when the map's tab is hidden: the heat plugin cannot draw on a
       0-px map, and a window resize (or phone rotation) while hidden would
       make it try. refresh() puts the heat layer back when the tab returns. */
    function sleep() {
      if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
    }

    refresh();
    onChange(refresh);
    return { map: map, refresh: refresh, sleep: sleep };
  }

  /* ---------- public API ---------- */
  return {
    KEY_REPORTS: KEY_REPORTS, CLUSTER_M: CLUSTER_M, DEVICES_NEEDED: DEVICES_NEEDED, SPEED_LOCK_MS: SPEED_LOCK_MS,
    ROUTE: ROUTE, TYPES: TYPES, SEED: SEED,
    deviceId: deviceId, allReports: allReports, localReports: localReports,
    addReport: addReport, simulateOtherDevice: simulateOtherDevice, resetLocal: resetLocal,
    distanceM: distanceM, nearestStop: nearestStop, groupReports: groupReports, spots: spots,
    addAssistRequest: addAssistRequest, assistRequests: assistRequests,
    onChange: onChange, shrinkPhoto: shrinkPhoto, makeMap: makeMap
  };
})();
