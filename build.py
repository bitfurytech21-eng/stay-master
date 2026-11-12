#!/usr/bin/env python3
"""Static site generator for the master rebuild.

Reads data/site.json and writes index.html, one page per city and one page
per building, all sharing styles.css / script.js and the images/ tree.
"""
import json
import os
import html

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = json.load(open(os.path.join(ROOT, 'data', 'site.json'), encoding='utf-8'))

CITIES = DATA['cities']
BUILDINGS = DATA['buildings']
CITY_BY_SLUG = {c['slug']: c for c in CITIES}


def e(s):
    return html.escape(str(s), quote=True)


def buildings_in(city_slug):
    return [b for b in BUILDINGS if b['city'] == city_slug]


def page_path(b):
    return b['slug'].replace('/', '-') + '.html'


_IMG_CACHE = {}


def img(b, n):
    """Resolve the real on-disk extension for a building photo."""
    key = (b['img'], n)
    if key in _IMG_CACHE:
        return _IMG_CACHE[key]
    base = 'images/buildings/%s-%02d' % (b['img'], n)
    for ext in ('.jpg', '.jpeg', '.png', '.webp'):
        if os.path.exists(os.path.join(ROOT, base + ext)):
            _IMG_CACHE[key] = base + ext
            return base + ext
    _IMG_CACHE[key] = base + '.jpg'
    return base + '.jpg'


# ---------------------------------------------------------------- chrome

def header(active=''):
    cities = ''.join(
        '<li><a href="%s.html"%s>%s</a></li>' % (
            c['slug'], ' aria-current="page"' if c['slug'] == active else '', e(c['name']))
        for c in CITIES)
    return '''<header class="site-header" id="siteHeader">
  <div class="header-inner">
    <a class="logo" href="index.html" aria-label="master — home">
      <img src="images/master-logo.svg" alt="master" width="120" height="26">
    </a>

    <nav class="primary-nav" aria-label="Primary">
      <a href="index.html#where">Cities</a>
      <a href="index.html#where">Luxury Apartments</a>
      <a href="index.html#welcome">Why Master</a>
      <a href="index.html#offer">Special Offers</a>
      <a href="index.html#footer">About us</a>
      <a href="index.html#footer">Contact Us</a>
    </nav>

    <div class="header-actions">
      <a class="btn-book" href="https://master.reserve-online.net/?lang=en" target="_blank" rel="noopener">Book Now</a>
      <button class="hamburger" id="menuToggle" aria-expanded="false" aria-controls="mainMenu" aria-label="Open menu">
        <span class="inside"></span>
      </button>
    </div>
  </div>

  <div class="main-menu" id="mainMenu" hidden>
    <div class="menu-col">
      <p class="menu-label">Cities</p>
      <ul class="menu-list">%s</ul>
    </div>
    <div class="menu-col">
      <p class="menu-label">Discover</p>
      <ul class="menu-list">
        <li><a href="index.html#where">Luxury Apartments</a></li>
        <li><a href="index.html#offer">Special Offers</a></li>
        <li><a href="index.html#welcome">Why Master</a></li>
        <li><a href="index.html#footer">About us</a></li>
        <li><a href="index.html#footer">Contact Us</a></li>
        <li><a href="https://master.reserve-online.net/?lang=en&amp;view=amend" target="_blank" rel="noopener">Manage your bookings</a></li>
      </ul>
      <p class="menu-label menu-label--spaced">Language</p>
      <ul class="lang-list">
        <li><a href="#" aria-current="true">EN</a></li>
        <li><a href="#">DE</a></li>
        <li><a href="#">IT</a></li>
        <li><a href="#">GR</a></li>
        <li><a href="#">ES</a></li>
        <li><a href="#">PL</a></li>
      </ul>
    </div>
  </div>
</header>''' % cities


def footer():
    cols = []
    for c in CITIES:
        items = ''.join(
            '<li><a href="%s">%s</a></li>' % (page_path(b), e(b['name']))
            for b in buildings_in(c['slug']))
        cols.append('''<div class="loc-col">
          <h3><a href="%s.html">%s</a></h3>
          <ul>%s</ul>
        </div>''' % (c['slug'], e(c['name']), items))

    return '''<footer class="site-footer" id="footer">
  <div class="wrap">
    <div class="footer-top">
      <div class="footer-locations">%s</div>

      <div class="footer-social">
        <h2 class="lucky">Keep in Touch</h2>
        <ul>
          <li><a href="https://www.instagram.com/stay.master/" target="_blank" rel="noopener" aria-label="Instagram">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>
          </a></li>
          <li><a href="https://www.facebook.com/people/Master-Aparthotel-Serviced-Apartments/61575637148714/" target="_blank" rel="noopener" aria-label="Facebook">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7h2.4l.4-2.9h-2.8V9.3c0-.8.2-1.4 1.4-1.4h1.5V5.3c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H8v2.9h2.5V21h3z"/></svg>
          </a></li>
          <li><a href="https://www.linkedin.com/company/master-serviced-apartments/" target="_blank" rel="noopener" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M6.9 8.6H4.2V20h2.7V8.6zM5.5 4a1.6 1.6 0 100 3.2 1.6 1.6 0 000-3.2zM20 13.6c0-3-1.6-4.4-3.7-4.4-1.7 0-2.5.9-2.9 1.6V8.6H10.7V20h2.7v-6.1c0-1.3.6-2.1 1.8-2.1 1.1 0 1.6.8 1.6 2.1V20H20v-6.4z"/></svg>
          </a></li>
        </ul>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="footer-credit">
        <a class="footer-logo" href="index.html" aria-label="master">
          <img src="images/master-logo.svg" alt="master" width="110" height="24" loading="lazy">
        </a>
        <div class="footer-legal">
          <ul class="legal-links">
            <li><a href="index.html#where">Luxury Apartments</a></li>
            <li><a href="index.html#offer">Special Offers</a></li>
            <li><a href="index.html#footer">About us</a></li>
            <li><a href="index.html#footer">Contact Us</a></li>
            <li><a href="index.html#footer">Privacy</a></li>
            <li><a href="index.html#footer">Terms of use</a></li>
          </ul>
          <p class="copyright">&copy; 2025 master</p>
        </div>
      </div>
    </div>
  </div>
</footer>''' % ''.join(cols)


def shell(title, desc, body, active=''):
    return '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<meta name="description" content="%s">
<meta name="theme-color" content="#003319">
<link rel="stylesheet" href="vendor/leaflet/leaflet.css">
<link rel="stylesheet" href="styles.css?v=2">
</head>
<body>

<a class="skip-link" href="#main">Skip to content</a>

%s

<main id="main">
%s
</main>

%s

<script src="vendor/leaflet/leaflet.js"></script>
<script src="script.js?v=2"></script>
</body>
</html>
''' % (e(title), e(desc), header(active), body, footer())


def cta_band(b=None):
    book = b['book'] if b else 'https://master.reserve-online.net/?lang=en'
    where = (' — ' + e(b['name'])) if b else ''
    return '''<section class="cta-band" id="offer">
  <div class="wrap">
    <div class="cta-inner">
      <div>
        <h2>Book directly with master and get 5%% off</h2>
        <p>Save More, Stay More: Book Directly With master For A 5%% Discount Today!%s</p>
      </div>
      <a class="btn-cream" href="%s" target="_blank" rel="noopener">Book Now</a>
    </div>
  </div>
</section>''' % (where, book)


def families(city):
    return '''<section class="section section--sand">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">%s with the family</p>
      <h2>Where Families Stay Smarter</h2>
      <p>%s</p>
    </div>
    <a class="btn-outline" href="%s.html">Find out more</a>
  </div>
</section>''' % (e(city['name']), e(city['family']), city['slug'])


# ---------------------------------------------------------------- cards

def building_card(b):
    c = CITY_BY_SLUG[b['city']]
    return '''<article class="bcard">
  <div class="bcard-media">
    <img src="%s" alt="%s" width="1024" height="683" loading="lazy" decoding="async">
    <span class="bcard-tag">%s</span>
  </div>
  <div class="bcard-body">
    <h3><a href="%s">%s</a></h3>
    <p class="bcard-addr">%s</p>
    <ul class="bcard-meta">
      <li><strong>%d</strong>Apartments</li>
      <li><strong>%s</strong>Bedrooms</li>
    </ul>
    <a class="btn-outline bcard-cta" href="%s">Check Availability</a>
  </div>
</article>''' % (img(b, 1), e(b['name'] + ' — ' + c['name']), e(b['kind']),
                 page_path(b), e(b['name']), e(b['address']),
                 b['apartments'], e(b['bedrooms']), page_path(b))


# ---------------------------------------------------------------- home

def build_home():
    cards = ''.join(building_card(b) for b in BUILDINGS)
    city_opts = ''.join('<option value="%s">%s</option>' % (c['slug'], e(c['name'])) for c in CITIES)

    city_cards = ''.join('''<article class="bcard">
  <div class="bcard-media">
    <img src="%s" alt="%s" width="1024" height="683" loading="lazy" decoding="async">
    <span class="bcard-tag">%s</span>
  </div>
  <div class="bcard-body">
    <h3><a href="%s.html">%s</a></h3>
    <p class="bcard-addr">%s</p>
    <ul class="bcard-meta">
      <li><strong>%d</strong>Buildings</li>
      <li><strong>%d</strong>Apartments</li>
    </ul>
    <a class="btn-outline bcard-cta" href="%s.html">Explore %s</a>
  </div>
</article>''' % (c['hero'], e(c['name']), e(c['country']), c['slug'], e(c['name']),
                 e(c['country']), len(buildings_in(c['slug'])),
                 sum(b['apartments'] for b in buildings_in(c['slug'])),
                 c['slug'], e(c['name']))
        for c in CITIES)

    body = '''<section class="hero">
  <div class="hero-media">
    <img src="images/buildings/london-master-st-pauls-01.jpg" alt="" width="1024" height="683">
  </div>
  <div class="wrap hero-inner">
    <h1>Where home<br>meets hotel</h1>
    <p class="hero-sub">Serviced apartments &amp; aparthotels across nine cities</p>

    <form class="searchbar" id="searchForm" action="index.html" method="get">
      <div class="sb-field">
        <label for="searchCity">Choose location</label>
        <select id="searchCity" name="city">%s</select>
      </div>
      <div class="sb-field">
        <label for="searchIn">Check in</label>
        <input id="searchIn" name="checkin" type="date">
      </div>
      <div class="sb-field">
        <label for="searchOut">Check out</label>
        <input id="searchOut" name="checkout" type="date">
      </div>
      <button type="submit">Search an Apartment</button>
    </form>
    <p class="search-note">Dates are passed to the city page; live availability and rates are confirmed on master's reservation system.</p>
  </div>
</section>

<section class="section" id="welcome">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">Welcome to master</p>
      <h2>Created for the modern traveler</h2>
      <p>We've combined the best elements of a hotel stay with beautifully-designed, fully-equipped apartments — in the middle of the cities you actually want to be in.</p>
    </div>

    <div class="pillars">
      <div class="pillar">
        <span class="num">01</span>
        <h3>Apartments with hotel amenities</h3>
        <p>Full kitchens, washer-dryers and workspace, with housekeeping, linen changes and hotel-standard service behind them.</p>
      </div>
      <div class="pillar">
        <span class="num">02</span>
        <h3>Exceptional service</h3>
        <p>A 24/7 remote team, self check-in where it helps, and people who answer — whether you stay two nights or two months.</p>
      </div>
      <div class="pillar">
        <span class="num">03</span>
        <h3>Seamless digital experience</h3>
        <p>Book direct, manage your stay online, and get the 5%% direct-booking discount without a phone call.</p>
      </div>
    </div>
  </div>
</section>

<section class="section section--cream" id="where">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">Where we are</p>
      <h2>Thirteen buildings, nine cities</h2>
      <p>Embrace the freedom to live, work and unwind in your very own urban sanctuary — or explore some of the most exciting cities in the world. Welcome to your new home away from home.</p>
    </div>
    <div class="building-grid">%s</div>
  </div>
</section>

<section class="section section--dark">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">The cities</p>
      <h2>Choose your city</h2>
      <p>From the City of London to the shores of Bat Yam — each destination has its own page with every building, address and apartment type.</p>
    </div>
    <div class="building-grid">%s</div>
  </div>
</section>

%s

%s''' % (city_opts, cards, city_cards,
         families(CITY_BY_SLUG['london']), cta_band())

    return shell(
        'master | Serviced Apartments & Aparthotels',
        'master combines the best elements of a hotel stay with beautifully-designed, fully-equipped apartments in London, Rome, Barcelona, Athens, Warsaw, Hamburg, Salzburg, Tel Aviv and Bat Yam.',
        body)


# ---------------------------------------------------------------- city

def build_city(c):
    bs = buildings_in(c['slug'])
    cards = ''.join(building_card(b) for b in bs)
    n = len(bs)
    count = '%d Building%s in %s' % (n, '' if n == 1 else 's', c['name'])

    body = '''<section class="city-hero">
  <div class="hero-media">
    <img src="%s" alt="" width="1024" height="683">
  </div>
  <div class="wrap city-hero-inner">
    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="index.html">master</a><span aria-hidden="true">&gt;</span><span aria-current="page">%s</span>
    </nav>
    <h1>%s</h1>
    <p class="count">%s</p>
  </div>
</section>

<section class="section section--tight">
  <div class="wrap">
    <div class="building-grid">%s</div>
  </div>
</section>

<section class="section section--cream">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">The neighbourhood</p>
      <h2>master experience in %s</h2>
    </div>
    <div class="prose">
      <p>%s</p>
      <div id="cityMore" hidden><p>%s</p></div>
      <button class="read-toggle" type="button" data-readmore="cityMore" aria-expanded="false" aria-controls="cityMore">Read more</button>
    </div>
  </div>
</section>

%s

%s''' % (c['hero'], e(c['name']), e(c['name']), e(count), cards,
         e(c['name']), e(c['intro']), e(c['more']), families(c), cta_band())

    return shell(c['title'], c['meta'], body, active=c['slug'])


# ---------------------------------------------------------------- building

FAC_ICON = ('<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" '
            'stroke-width="1.5" aria-hidden="true"><path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/></svg>')


def build_building(b):
    c = CITY_BY_SLUG[b['city']]
    n = b['count']

    cells = []
    for i in range(1, 5):
        overlay = ''
        if i == 4 and n > 4:
            overlay = '<span class="more-count">+%d photos</span>' % (n - 4)
        cells.append('''<div class="bg-cell">
      <button class="gallery-btn" type="button" data-index="%d" aria-label="Open photo %d of %d">
        <img src="%s" alt="%s — photo %d" width="1024" height="683" %s decoding="async">%s
      </button>
    </div>''' % (i - 1, i, n, img(b, i), e(b['name']), i,
                 'loading="eager"' if i == 1 else 'loading="lazy"', overlay))

    grid_cells = []
    for i in range(1, n + 1):
        cls = 'gallery-cell'
        if i == 1:
            cls += ' gallery-cell--wide'
        elif i == 6:
            cls += ' gallery-cell--tall'
        grid_cells.append('''<li class="%s">
          <button class="gallery-btn" type="button" data-index="%d" aria-label="Open photo %d of %d">
            <img src="%s" alt="%s — photo %d" width="1024" height="683" loading="lazy" decoding="async">
            <span class="gallery-cap">%s</span>
          </button>
        </li>''' % (cls, i - 1, i, n, img(b, i), e(b['name']), i, e(b['name'])))

    apts = []
    for idx, (name, guests, beds, baths, sqm) in enumerate(b['apts']):
        photo = img(b, (idx % n) + 1)
        apts.append('''<article class="apt-card">
  <div class="apt-card-media">
    <img src="%s" alt="%s" width="1024" height="683" loading="lazy" decoding="async">
  </div>
  <div class="apt-card-body">
    <h3>%s</h3>
    <ul class="apt-specs">
      <li><span>Guests</span><strong>%s</strong></li>
      <li><span>Bedrooms</span><strong>%d</strong></li>
      <li><span>Bathrooms</span><strong>%d</strong></li>
      <li><span>Size</span><strong>%d m²</strong></li>
    </ul>
    <a class="btn-outline" href="%s" target="_blank" rel="noopener">Check Availability</a>
  </div>
</article>''' % (photo, e(name), e(name), e(guests), beds, baths, sqm, b['book']))

    facs = ''.join('<div class="fac-item">%s<p>%s</p></div>' % (FAC_ICON, e(f)) for f in b['facilities'])

    apt_more = ''
    if b['aptMore']:
        apt_more = '''<div id="aptMore" hidden><p>%s</p></div>
      <button class="read-toggle" type="button" data-readmore="aptMore" aria-expanded="false" aria-controls="aptMore">Read more</button>''' % e(b['aptMore'])

    osm = 'https://www.openstreetmap.org/?mlat=%s&amp;mlon=%s#map=17/%s/%s' % (b['lat'], b['lon'], b['lat'], b['lon'])
    gmaps = 'https://www.google.com/maps/search/?api=1&amp;query=' + e(b['address'].replace(' ', '+'))

    body = '''<section class="bhero">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="index.html">master</a><span aria-hidden="true">&gt;</span><a href="%s.html">%s</a><span aria-hidden="true">&gt;</span><span aria-current="page">%s</span>
    </nav>
    <div class="bhero-top">
      <div>
        <h1>%s</h1>
        <p class="addr">%s &nbsp;·&nbsp; <a href="#location">Map</a></p>
      </div>
      <ul class="bhero-facts">
        <li><strong>%d</strong>Apartments</li>
        <li><strong>%s</strong>Bedrooms</li>
        <li><strong>%s</strong>Check-in</li>
      </ul>
    </div>
  </div>
  <div class="wrap">
    <div class="bhero-gallery" id="galleryGrid">%s</div>
  </div>
</section>

<nav class="subnav" aria-label="Building sections">
  <div class="wrap">
    <ul>
      <li><a href="#overview">Overview</a></li>
      <li><a href="#apartments">The Apartments</a></li>
      <li><a href="#facilities">Facilities</a></li>
      <li><a href="#location">The neighbourhood</a></li>
      <li><a href="#goodtoknow">Good to know</a></li>
      <li><a href="#faq">FAQ</a></li>
    </ul>
  </div>
</nav>

<section class="section" id="overview">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">%s · %s</p>
      <h2>%s</h2>
    </div>
    <div class="prose">
      <p>%s</p>
      <div id="ovMore" hidden><p>%s</p></div>
      <button class="read-toggle" type="button" data-readmore="ovMore" aria-expanded="false" aria-controls="ovMore">Read more</button>
    </div>
  </div>
</section>

<section class="section section--cream" id="apartments">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">%d apartments</p>
      <h2>The Apartments</h2>
      <p>%s</p>
    </div>
    <div class="prose" style="margin-bottom:34px">%s</div>
    <div class="apt-grid">%s</div>
  </div>
</section>

<section class="section" id="facilities">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">Services &amp; facilities</p>
      <h2>What's included</h2>
    </div>
    <div class="fac-grid">%s</div>
  </div>
</section>

<section class="section section--sand" id="location">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">The neighbourhood</p>
      <h2>%s</h2>
      <p>%s</p>
    </div>
    <div class="loc-grid">
      <div class="map-canvas">
        <div class="map-leaflet loc-map" data-map data-lat="%s" data-lon="%s" data-label="%s" data-zoom="16"
             role="application" aria-label="Interactive map showing %s. Use arrow keys to pan, plus and minus to zoom."></div>
        <div class="map-fallback" hidden>
          <p>The interactive map could not load.</p>
          <a class="map-link" href="%s" target="_blank" rel="noopener">View %s on OpenStreetMap</a>
        </div>
        <a class="map-link" href="%s" target="_blank" rel="noopener">Open in Maps</a>
      </div>
      <div class="getting-here">
        <h3>Our address</h3>
        <p>%s</p>
        <h3>Getting here</h3>
        <p>%s is in %s. Use the map to plan your route, or open the address in your maps app for live directions and public transport.</p>
        <ul>
          <li>Check-in from %s, check-out by %s.</li>
          <li>Reception and support are remote — details are sent before arrival.</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="section" id="goodtoknow">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">Good to know</p>
      <h2>Before you arrive</h2>
    </div>
    <dl class="gtk">
      <div><dt>Check in</dt><dd>%s</dd></div>
      <div><dt>Check out</dt><dd>%s</dd></div>
      <div><dt>Apartments</dt><dd>%d</dd></div>
      <div><dt>Bedrooms</dt><dd>%s</dd></div>
    </dl>
  </div>
</section>

<section class="section section--cream" id="faq">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">FAQ</p>
      <h2>Common questions</h2>
    </div>
    <div class="faq">
      <details>
        <summary>What exactly is %s — hotel, aparthotel, or serviced apartments?</summary>
        <p>%s offers serviced apartments that combine private living spaces with hotel-style conveniences, including virtual guest support, housekeeping and access to laundry facilities.</p>
      </details>
      <details>
        <summary>What type of traveller is %s best suited for?</summary>
        <p>It suits business travellers, couples and families seeking spacious serviced apartments with kitchen facilities in %s.</p>
      </details>
      <details>
        <summary>Is it suitable for a long-term stay of several weeks or more?</summary>
        <p>Yes. Fully equipped kitchens, laundry facilities and apartment-style layouts make it comfortable for extended stays.</p>
      </details>
      <details>
        <summary>Do the apartments have fully equipped kitchens?</summary>
        <p>Yes — each apartment includes a kitchen with stovetop, fridge, cookware and utensils, plus coffee-making facilities.</p>
      </details>
      <details>
        <summary>Is there Wi-Fi throughout the property?</summary>
        <p>Yes, complimentary high-speed Wi-Fi covers every apartment and all shared areas for guests.</p>
      </details>
      <details>
        <summary>What are the check-in and check-out times?</summary>
        <p>Check-in is from %s and check-out is by %s. Guests receive arrival instructions before their stay.</p>
      </details>
      <details>
        <summary>How do I get the best rate?</summary>
        <p>Book directly with master and get 5%% off. Rates and live availability are confirmed on the reservation system.</p>
      </details>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">Gallery</p>
      <h2>Take a look around</h2>
      <p>Every photo of %s. Tap any image to open it full size.</p>
    </div>
    <ul class="gallery-grid" id="galleryGridFull">%s</ul>
  </div>
</section>

%s''' % (c['slug'], e(c['name']), e(b['name']),
         e(b['name']), e(b['address']),
         b['apartments'], e(b['bedrooms']), e(b['checkin']),
         ''.join(cells),
         e(c['name']), e(b['kind']), e(b['name']),
         e(b['intro']), e(b['more']),
         b['apartments'], e(b['aptIntro']), apt_more, ''.join(apts),
         facs,
         e(c['name']), e(b['address']),
         b['lat'], b['lon'], e(b['name']), e(b['name']),
         osm, e(b['name']), gmaps,
         e(b['address']), e(b['name']), e(c['name']),
         e(b['checkin']), e(b['checkout']),
         e(b['checkin']), e(b['checkout']), b['apartments'], e(b['bedrooms']),
         e(b['name']), e(b['name']), e(b['name']), e(c['name']),
         e(b['checkin']), e(b['checkout']),
         e(b['name']), ''.join(grid_cells),
         cta_band(b))

    title = '%s | %s | master' % (b['name'], c['name'])
    desc = '%s — %d serviced apartments at %s. %s' % (b['name'], b['apartments'], b['address'], b['bedrooms'])

    lb = '''<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" hidden>
  <button class="lb-close" id="lbClose" type="button" aria-label="Close photo viewer">&times;</button>
  <button class="lb-nav lb-prev" id="lbPrev" type="button" aria-label="Previous photo">&#8249;</button>
  <figure class="lb-figure">
    <img id="lbImage" src="" alt="">
    <figcaption id="lbCaption"></figcaption>
  </figure>
  <button class="lb-nav lb-next" id="lbNext" type="button" aria-label="Next photo">&#8250;</button>
</div>'''

    page = shell(title, desc, body, active=c['slug'])
    page = page.replace('</main>', lb + '\n</main>')
    return page


# ---------------------------------------------------------------- write

def main():
    written = []

    def w(name, content):
        with open(os.path.join(ROOT, name), 'w', encoding='utf-8') as f:
            f.write(content)
        written.append(name)

    w('index.html', build_home())
    for c in CITIES:
        w(c['slug'] + '.html', build_city(c))
    for b in BUILDINGS:
        w(page_path(b), build_building(b))

    print('wrote %d pages' % len(written))
    for n in written:
        print('  ', n)


if __name__ == '__main__':
    main()
