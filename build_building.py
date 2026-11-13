#!/usr/bin/env python3
"""Building (property) page renderer for the master site.

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


def build_building(b):
    _m = _helpers()
    CITY_BY_SLUG = _m.CITY_BY_SLUG
    SUBPAGES = _m.SUBPAGES
    e = _m.e
    img = _m.img
    apt_href = _m.apt_href
    booking_href = _m.booking_href
    mailto = _m.mailto
    shell = _m.shell
    cta_band = _m.cta_band
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
        apt_mail = mailto(
            'Booking enquiry — %s, %s' % (name, b['name']),
            'Hello,\n\nI would like to enquire about availability for the %s at %s, %s.\n\n'
            'Arrival:\nDeparture:\nGuests:\n\nThank you.' % (name, b['name'], b['address']))
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
      <li><span>Size</span><strong>%d m²</strong></li>
    </ul>
    <a class="btn-outline" href="%s">Check Availability</a>
  </div>
</article>''' % (photo, e(name), apt_link, e(name), e(guests), beds, baths, sqm, e(apt_book)))

    facs = ''.join('<div class="fac-item">%s<p>%s</p></div>' % (FAC_ICON, e(f)) for f in b['facilities'])

    subs = SUBPAGES.get(b['slug'], {})
    subnav = ''
    if subs:
        labels = {
            'poznaj-nasze-apartamenty': 'Our apartments',
            'udogodnienia': 'Amenities',
            'galeria': 'Gallery',
            'lokalizacja': 'Location',
            'opinie': 'Reviews',
            'oferty-specjalne': 'Special offers',
            'kontakt': 'Contact',
        }
        items = ''.join('<li><a href="%s">%s</a></li>' % (e(f), e(labels.get(k, k.replace('-', ' ').title())))
                        for k, f in subs.items())
        subnav = '<nav class="building-subnav" aria-label="Property sections"><ul>%s</ul></nav>' % items

    body = '''<section class="building-hero">
  <div class="hero-media"><img src="%s" alt="%s" width="1600" height="900"></div>
  <div class="wrap building-hero-inner">
    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="index.html">master</a><span aria-hidden="true">&gt;</span>
      <a href="%s.html">%s</a><span aria-hidden="true">&gt;</span>
      <span aria-current="page">%s</span>
    </nav>
    <h1>%s</h1>
    <p class="building-addr">%s</p>
    <a class="btn-solid" href="%s">Check availability</a>
  </div>
</section>

%s

<section class="section">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">The apartments</p>
      <h2>Stay at %s</h2>
    </div>
    <div class="apt-grid">%s</div>
  </div>
</section>

<section class="section section--cream">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">Take a look around</p>
      <h2>Gallery</h2>
    </div>
    <div class="gallery-grid">%s</div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">Good to know</p>
      <h2>Facilities</h2>
    </div>
    <div class="fac-grid">%s</div>
  </div>
</section>

%s''' % (e(img(b, 1)), e(b['name']), e(c['slug']), e(c['name']), e(b['name']),
         e(b['name']), e(b.get('address', '')),
         e(booking_href(b, b['apts'][0][0] if b['apts'] else '')),
         subnav, e(b['name']), ''.join(apts), ''.join(grid_cells), facs, cta_band())

    return shell(b['title'], b['meta'], body, active=c['slug'])
