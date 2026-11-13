#!/usr/bin/env python3
"""Static site generator for the master rebuild.\n\nAll booking calls route through the first-party Stay Master booking platform.

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
    from urllib.parse import quote
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


# building slug -> {apartment name: live room code}, taken from the real site
_ROOMS = {}
_rp = os.path.join(ROOT, 'data', 'rooms.json')
if os.path.exists(_rp):
    _ROOMS = json.load(open(_rp, encoding='utf-8'))


def booking_href(b, name):
    """Deep-link an apartment straight into the first-party booking engine.

    The engine reads city, unit, guests and dates from the query string, so the
    guest lands on the right apartment with the search already run. Where the
    live site publishes a room code for the apartment we pass it through, so the
    booking engine can preselect the exact room type.
    """
    city = CITY_BY_SLUG[b['city']]['slug']
    href = 'booking.html?city=%s&unit=%s' % (city, quote(name))
    code = _ROOMS.get(b['slug'], {}).get(name)
    if code:
        href += '&room=' + quote(code)
    return href


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