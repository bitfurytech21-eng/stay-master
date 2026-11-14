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

# Per-unit nightly rates, written by make_rates.py. A unit missing here has no
# published rate and is shown as "Rate on request" rather than a fake price.
_RATES = {}
_rp = os.path.join(ROOT, 'data', 'rates.json')
if os.path.exists(_rp):
    _RATES = json.load(open(_rp, encoding='utf-8')).get('rates', {})


def nightly_rate(b, name):
    """Return (amount, currency) for an apartment, or (0, '') when unpriced."""
    rate = _RATES.get(b['slug'], {}).get(name) or {}
    return int(rate.get('nightly') or 0), rate.get('currency') or ''


def rate_label(b, name):
    """Human-readable rate line for an apartment card."""
    amount, currency = nightly_rate(b, name)
    if amount <= 0:
        return 'Rate on request'
    return 'From %s %s / night' % (format(amount, ','), currency)

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


# Page chrome and the city/home renderers live in their own module; import it
# last so the helpers above are already defined when it imports them back.
from build_pages import (  # noqa: E402
    header, footer, shell, cta_band, families, building_card,
)
from build_city import build_home, build_city  # noqa: E402
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
        content = f.read()
    # The Render service serves index.html at the domain root. If that file is
    # only the repository bootstrap placeholder, generate the real homepage
    # from the site data instead of publishing the placeholder to visitors.
    if content.strip() == 'PLACEHOLDER_INDEX':
        return None
    return content


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
