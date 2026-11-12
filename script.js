(function () {
  'use strict';

  /* ---------- sticky header shadow ---------- */
  var header = document.getElementById('siteHeader');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('is-stuck', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- slide-down menu ---------- */
  var toggle = document.getElementById('menuToggle');
  var menu = document.getElementById('mainMenu');

  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (menu.contains(e.target) || toggle.contains(e.target)) return;
      setMenu(false);
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
  }

  /* ---------- interactive maps (Leaflet + OpenStreetMap) ---------- */
  var mapEls = document.querySelectorAll('[data-map]');

  function showMapFallback(el) {
    var wrap = el.closest('.map-canvas') || el.parentNode;
    var fb = wrap.querySelector('.map-fallback');
    el.hidden = true;
    if (fb) fb.hidden = false;
  }

  Array.prototype.forEach.call(mapEls, function (el) {
    if (typeof window.L === 'undefined') { showMapFallback(el); return; }
    var lat = parseFloat(el.getAttribute('data-lat'));
    var lon = parseFloat(el.getAttribute('data-lon'));
    var label = el.getAttribute('data-label') || 'master';
    var zoom = parseInt(el.getAttribute('data-zoom') || '16', 10);
    if (isNaN(lat) || isNaN(lon)) { showMapFallback(el); return; }

    try {
      var map = L.map(el, {
        center: [lat, lon],
        zoom: zoom,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
      }).addTo(map);

      var pinIcon = L.divIcon({
        className: 'map-pin-icon',
        html: '<span class="pin-dot"></span><span class="pin-label">' + label + '</span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      L.marker([lat, lon], { icon: pinIcon, title: label, alt: label })
        .addTo(map)
        .bindPopup('<strong>' + label + '</strong>');

      map.on('click focus', function () { map.scrollWheelZoom.enable(); });
      map.on('mouseout blur', function () { map.scrollWheelZoom.disable(); });

      window.addEventListener('resize', function () { map.invalidateSize(); });
      setTimeout(function () { map.invalidateSize(); }, 250);
    } catch (err) {
      showMapFallback(el);
    }
  });

  /* ---------- gallery lightbox ---------- */
  var heroGrid = document.getElementById('galleryGrid');
  var fullGrid = document.getElementById('galleryGridFull');
  var lightbox = document.getElementById('lightbox');
  var lbImage = document.getElementById('lbImage');
  var lbCaption = document.getElementById('lbCaption');
  var lbClose = document.getElementById('lbClose');
  var lbPrev = document.getElementById('lbPrev');
  var lbNext = document.getElementById('lbNext');

  if (lightbox && lbImage) {
    /* The hero strip and the full gallery are two views of the SAME photo set,
       so both are wired to one lightbox and share its index. */
    var buttons = Array.prototype.slice.call(
      document.querySelectorAll('#galleryGrid .gallery-btn, #galleryGridFull .gallery-btn')
    );
    var photos = buttons.map(function (btn) {
      var img = btn.querySelector('img');
      var cap = btn.querySelector('.gallery-cap');
      return {
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt') || '',
        caption: cap ? cap.textContent.trim() : ''
      };
    });
    var current = 0;
    var lastFocus = null;

    function render(i) {
      if (!photos.length) return;
      current = (i + photos.length) % photos.length;
      var p = photos[current];
      lbImage.setAttribute('src', p.src);
      lbImage.setAttribute('alt', p.alt);
      lbCaption.textContent = (p.caption ? p.caption + '  \u00b7  ' : '') + (current + 1) + ' / ' + photos.length;
    }

    function open(i) {
      lastFocus = document.activeElement;
      render(i);
      lightbox.hidden = false;
      document.body.classList.add('lb-open');
      lbClose.focus();
    }

    function close() {
      lightbox.hidden = true;
      document.body.classList.remove('lb-open');
      lbImage.setAttribute('src', '');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    buttons.forEach(function (btn, i) {
      btn.addEventListener('click', function () { open(i); });
    });

    lbClose.addEventListener('click', close);
    lbPrev.addEventListener('click', function () { render(current - 1); });
    lbNext.addEventListener('click', function () { render(current + 1); });

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) close();
    });

    document.addEventListener('keydown', function (e) {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') { close(); }
      else if (e.key === 'ArrowLeft') { render(current - 1); }
      else if (e.key === 'ArrowRight') { render(current + 1); }
      else if (e.key === 'Tab') {
        var focusables = [lbClose, lbPrev, lbNext];
        var idx = focusables.indexOf(document.activeElement);
        e.preventDefault();
        var next = e.shiftKey ? idx - 1 : idx + 1;
        if (next < 0) next = focusables.length - 1;
        if (next >= focusables.length) next = 0;
        focusables[next].focus();
      }
    });
  }

  /* ---------- read more / read less ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-readmore]'), function (btn) {
    var target = document.getElementById(btn.getAttribute('data-readmore'));
    if (!target) return;
    btn.addEventListener('click', function () {
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      var next = !expanded;
      btn.setAttribute('aria-expanded', String(next));
      target.hidden = !next;
      btn.textContent = next ? 'Read Less' : 'Read more';
    });
  });

  /* ---------- home search: route to the chosen city ---------- */
  var searchForm = document.getElementById('searchForm');
  if (searchForm) {
    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var city = searchForm.querySelector('#searchCity');
      var dest = city && city.value ? city.value : 'london';
      window.location.href = dest + '.html';
    });
  }
})();
