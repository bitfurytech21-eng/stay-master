#!/usr/bin/env python3
"""Data preparation for a building (property) page.

Split out of build.py so each module stays a manageable size. The shared
helpers live in build.py and are imported at call time, because build.py
imports this module at the end of its own file (a module-level import back
would be circular).
"""
import os


def _helpers():
    import build
    return build


# ---------------------------------------------------------------- building

FAC_ICON = ('<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" '
            'stroke-width="1.5" aria-hidden="true"><path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/></svg>')


def building_parts(b):
    _m = _helpers()
    CITY_BY_SLUG = _m.CITY_BY_SLUG
    SUBPAGES = _m.SUBPAGES
    e = _m.e
    img = _m.img
    apt_href = _m.apt_href
    booking_href = _m.booking_href
    mailto = _m.mailto
    c = CITY_BY_SLUG[b['city']]
    n = b['count']

    cells = []
    for i in range(1, 5):
        overlay = ''
        if i == 4 and n > 4:
            overlay = '<span class="more-count">+%d photos</span>' % (n - 4)
        cells.append('''<div class="bg-cell">
      <button class="gallery-btn" type="button" data-index="%d" aria-label="Open photo %d of %d">
        <img src="%s" alt="%s \u2014 photo %d" width="1024" height="683" %s decoding="async">%s
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
            <img src="%s" alt="%s \u2014 photo %d" width="1024" height="683" loading="lazy" decoding="async">
            <span class="gallery-cap">%s</span>
          </button>
        </li>''' % (cls, i - 1, i, n, img(b, i), e(b['name']), i, e(b['name'])))

    apts = []
    for idx, (name, guests, beds, baths, sqm) in enumerate(b['apts']):
        photo = img(b, (idx % n) + 1)
        apt_link = apt_href(b, name)
        # "Check Availability" must reach the first-party booking engine, not a
        # mail client: the engine reads city/unit from the query string and runs
        # the availability call against the booking API.
        apt_book = booking_href(b, name)
        apts.append('''<article class="apt-card">
  <div class="apt-card-media">
    <img src="%s" alt="%s" width="1024" height="683" loading="lazy" decoding="async">
  </div>
  <div class="apt-card-body">
    <h3><a href="%s">%s</a></h3>
    <ul class="apt-specs">
      <li><span>Guests</span><strong>%s</strong></li>
      <li><span>Bedrooms</span><strong>%d</strong></li>
      <li><span>Bathrooms</span><strong>%d</strong></li>
      <li><span>Size</span><strong>%d m\u00b2</strong></li>
    </ul>
    <a class="btn-outline" href="%s">Check Availability</a>
  </div>
</article>''' % (photo, e(name), apt_link, e(name), e(guests), beds, baths, sqm, e(apt_book)))

    facs = ''.join('<div class="fac-item">%s<p>%s</p></div>' % (FAC_ICON, e(f)) for f in b['facilities'])

    apt_more = ''
    if b['aptMore']:
        apt_more = '''<div id="aptMore" hidden><p>%s</p></div>
      <button class="read-toggle" type="button" data-readmore="aptMore" aria-expanded="false" aria-controls="aptMore">Read more</button>''' % e(b['aptMore'])

    # Building subnav: link the standalone pages where they exist, and fall back
    # to the on-page section anchor where they do not. Without this the per-
    # building sub-pages were generated but nothing ever linked to them.
    subs = SUBPAGES.get(b['slug'], {})

    def first_sub(*keys):
        for k in keys:
            if k in subs:
                return subs[k]
        return None

    def nav_item(label, filename, anchor):
        href = filename if filename else '#' + anchor
        return '<li><a href="%s">%s</a></li>' % (href, label)

    nav_items = [nav_item('Overview', None, 'overview')]
    nav_items.append(nav_item('The Apartments', first_sub('apartments'), 'apartments'))
    nav_items.append(nav_item('Facilities', first_sub('facilities', 'services-facilities'), 'facilities'))
    nav_items.append(nav_item('The neighbourhood', first_sub('location', 'the-location'), 'location'))
    nav_items.append(nav_item('Good to know', None, 'goodtoknow'))
    nav_items.append(nav_item('FAQ', first_sub('faq'), 'faq'))
    nav_items.append(nav_item('Reviews', first_sub('reviews'), 'reviews'))
    nav_items.append(nav_item('Special Offers', first_sub('special-offers'), 'offer'))

    return {
        'c': c, 'n': n, 'cells': ''.join(cells), 'grid_cells': ''.join(grid_cells),
        'apts': ''.join(apts), 'facs': facs, 'apt_more': apt_more,
        'nav_items': ''.join(nav_items),
    }
