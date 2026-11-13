#!/usr/bin/env python3
"""Static site generator for the master rebuild.

All booking calls route through the first-party Stay Master booking platform.

Reads data/site.json and writes index.html, one page per city and one page
per building, all sharing styles.css / script.js and the images/ tree.
"""
import json
import os
import html
import re
from urllib.parse import quote

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = json.load(open(os.path.join(ROOT, 'data', 'site.json'), encoding='utf-8'))

CITIES = DATA['cities']
BUILDINGS = DATA['buildings']
CITY_BY_SLUG = {c['slug']: c for c in CITIES}


def e(s):
    return html.escape(str(s), quote=True)


CONTACT_EMAIL = 'easytravelagency@trustagent.space'


def mailto(subject, body=''):
    """Build a mailto: URL with a prefilled subject and body."""
    url = 'mailto:%s?subject=%s' % (CONTACT_EMAIL, quote(subject))
    if body:
        url += '&body=' + quote(body)
    return url


def buildings_in(city_slug):
    return [b for b in BUILDINGS if b['city'] == city_slug]


def page_path(b):
    return b['slug'].replace('/', '-') + '.html'


# --- standalone sub-pages per building (written by build_extra.py) ----------
# building slug -> {sub-key: filename}, so the building subnav can point at the
# real pages instead of leaving them unreachable.
def _subpages():
    p = os.path.join(ROOT, 'data', 'extra.json')
    out = {}
    if not os.path.exists(p):
        return out
    d = json.load(open(p, encoding='utf-8'))
    for k in d:
        if not k.startswith('sub') or '__' not in k:
            continue
        parent, sub = k[3:].split('__', 1)
        slug = parent.replace('_', '/', 1)
        slug = {'tel-aviv/master-mazeh': 'tel-aviv/mazeh-tel-aviv'}.get(slug, slug)
        if sub == 'poznaj-nasze-apartamenty':
            continue
        out.setdefault(slug, {})[sub] = '%s-%s.html' % (slug.replace('/', '-'), sub)
    return out


SUBPAGES = _subpages()

# building slug -> {apartment name: live room code}, taken from the real site
_ROOMS = {}
_rp = os.path.join(ROOT, 'data', 'rooms.json')
if os.path.exists(_rp):
    _ROOMS = json.load(open(_rp, encoding='utf-8'))


def booking_href(b, name):
    """Deep-link an apartment into the first-party booking engine.

    The engine reads city, unit and dates from the query string, so the guest
    lands on the right apartment with the search already run. Where the live
    site publishes a room code we pass it through, so the engine can preselect
    the exact room type.
    """
    city = CITY_BY_SLUG[b['city']]['slug']
    href = 'booking.html?city=%s&unit=%s' % (city, quote(name))
    code = _ROOMS.get(b['slug'], {}).get(name)
    if code:
        href += '&room=' + quote(code)
    return href


_IMG_CACHE = {}

# apartment-name -> live slug map, written by build_extra.py
_APTMAP = {}
_ap = os.path.join(ROOT, 'data', 'aptmap.json')
if os.path.exists(_ap):
    _APTMAP = json.load(open(_ap, encoding='utf-8'))


def apt_href(b, name):
    """Link an apartment card to its detail page (live slug when known)."""
    slug = _APTMAP.get('%s|%s' % (b['slug'], name))
    if not slug:
        slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    return '%s-apartments-%s.html' % (b['slug'].replace('/', '-'), slug)


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

def header(active='', book_href=None, book_label='Book Now'):
    cities = ''.join(
        '<li><a href="%s.html"%s>%s</a></li>' % (
            c['slug'], ' aria-current="page"' if c['slug'] == active else '', e(c['name']))
        for c in CITIES)
    # Always route booking actions to the first-party booking platform.
    book_href = 'booking.html'
    book_attrs = ''
    return '''<header class="site-header" id="siteHeader">
  <div class="header-inner">
    <a class="logo" href="index.html" aria-label="master — home">
      <img src="images/master-logo.svg" alt="master" width="120" height="26">
    </a>

    <nav class="primary-nav" aria-label="Primary">
      <a href="index.html#where">Cities</a>
      <a href="luxury-apartments.html">Luxury Apartments</a>
      <a href="why-master.html">Why Master</a>
      <a href="special-offers.html">Special Offers</a>
      <a href="about.html">About us</a>
      <a href="mailto:easytravelagency@trustagent.space">Contact Us</a>
    </nav>

    <div class="header-actions">
      <a class="btn-book" href="%s"%s>%s</a>
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
        <li><a href="luxury-apartments.html">Luxury Apartments</a></li>
        <li><a href="special-offers.html">Special Offers</a></li>
        <li><a href="why-master.html">Why Master</a></li>
        <li><a href="about.html">About us</a></li>
        <li><a href="locations.html">Locations</a></li>
        <li><a href="careers.html">Careers</a></li>
        <li><a href="contact-us.html">Contact &amp; enquiries</a></li>
        <li><a href="mailto:easytravelagency@trustagent.space">Contact Us</a></li>
        <li><a href="booking.html#guestAccess">Manage your bookings</a></li>
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
</header>''' % (e(book_href), book_attrs, e(book_label), cities)


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
      <div class="footer-brand">
        <img src="images/master-logo.svg" alt="master" width="120" height="26">
        <p>Serviced apartments in the heart of Europe's most loved cities.</p>
      </div>
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
      <p>&copy; 2025 master. All rights reserved.</p>
      <ul class="footer-legal">
        <li><a href="terms.html">Terms</a></li>
        <li><a href="privacy.html">Privacy</a></li>
        <li><a href="cookies.html">Cookies</a></li>
        <li><a href="contact-us.html">Contact</a></li>
      </ul>
    </div>
  </div>
</footer>''' % ''.join(cols)


def shell(title, meta, body, active=''):
    return '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<meta name="description" content="%s">
<link rel="icon" href="images/favicon.svg">
<link rel="stylesheet" href="styles.css">
</head>
<body>
%s
<main id="main">%s</main>
%s
<script src="script.js"></script>
<script src="translator.js"></script>
</body>
</html>''' % (e(title), e(meta), header(active), body, footer())


def cta_band():
    return '''<section class="cta-band">
  <div class="wrap cta-inner">
    <h2>Ready to stay with master?</h2>
    <p>Book direct for the best available rate and a warm welcome in every city.</p>
    <a class="btn-solid" href="booking.html">Check availability</a>
  </div>
</section>'''


def families(c):
    bs = buildings_in(c['slug'])
    if not bs:
        return ''
    cards = ''.join(building_card(b) for b in bs)
    return '''<section class="section">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">Where to stay</p>
      <h2>Our buildings in %s</h2>
    </div>
    <div class="building-grid">%s</div>
  </div>
</section>''' % (e(c['name']), cards)


def building_card(b):
    return '''<article class="building-card">
  <a class="building-photo" href="%s">
    <img src="%s" alt="%s" loading="lazy" width="640" height="480">
  </a>
  <div class="building-body">
    <h3><a href="%s">%s</a></h3>
    <p class="building-city">%s</p>
    <p class="building-count">%d apartment%s</p>
  </div>
</article>''' % (page_path(b), e(img(b, 1)), e(b['name']), page_path(b), e(b['name']),
                e(CITY_BY_SLUG[b['city']]['name']), len(b['apts']),
                '' if len(b['apts']) == 1 else 's')


# ---------------------------------------------------------------- home

def build_home():
    """Fallback homepage, used only when index.html is absent.

    The shipped homepage is hand-maintained (see _hand_maintained_home); this
    keeps a fresh checkout working if that file is ever missing.
    """
    cards = ''.join(
        '''<a class="city-card" href="%s.html">
  <img src="%s" alt="%s" loading="lazy" width="600" height="800">
  <span class="city-card-name">%s</span>
</a>''' % (c['slug'], e(c['hero']), e(c['name']), e(c['name']))
        for c in CITIES)
    body = '''<section class="home-hero">
  <div class="wrap">
    <h1>Where home meets hotel</h1>
    <p>Serviced apartments in Europe's most loved cities.</p>
    <a class="btn-solid" href="booking.html">Book your stay</a>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">Where we are</p>
      <h2>Our cities</h2>
    </div>
    <div class="city-grid">%s</div>
  </div>
</section>

%s''' % (cards, cta_band())
    return shell('master — serviced apartments',
                 'Serviced apartments in Europe\'s most loved cities.', body)


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


# The building-page renderer lives in its own module; import it last so the
# helpers above are already defined when it imports them back.
from build_building import build_building  # noqa: E402


# ---------------------------------------------------------------- write

def _hand_maintained_home():
    """Return the hand-maintained homepage, or None if it is not present.

    index.html is a bespoke design that does not share the city/building page
    layout, so it is maintained by hand and is its own source of truth.
    Regenerating the rest of the site must never revert it.
    """
    p = os.path.join(ROOT, 'index.html')
    if not os.path.exists(p):
        return None
    with open(p, encoding='utf-8') as f:
        return f.read()


def main():
    written = []

    def w(name, content):
        with open(os.path.join(ROOT, name), 'w', encoding='utf-8') as f:
            f.write(content)
        written.append(name)

    home = _hand_maintained_home()
    w('index.html', home if home is not None else build_home())
    for c in CITIES:
        w(c['slug'] + '.html', build_city(c))
    for b in BUILDINGS:
        w(page_path(b), build_building(b))

    print('wrote %d pages' % len(written))
    for n in written:
        print('  ', n)


if __name__ == '__main__':
    main()
