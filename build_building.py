#!/usr/bin/env python3
"""Building (property) page renderer for the master site.

Split out of build.py so each module stays a manageable size. The shared
helpers live in build.py and are imported at call time (build.py imports this
module at the end of its own file, so a module-level import back would be
circular).
"""
import os


FAC_ICON = ('<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" '
            'stroke-width="1.4" aria-hidden="true"><path d="M4 12l5 5L20 6"/></svg>')


def _helpers():
    """Import the shared helpers from build.py at call time."""
    import build
    return build


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
    photos = [img(b, i) for i in range(1, n + 1)]

    # --- gallery: first photo is the hero, the rest fill the grid
    hero = photos[0]
    thumbs = ''.join(
        '<button class="gallery-thumb" type="button" data-full="%s" aria-label="View photo %d">'
        '<img src="%s" alt="%s photo %d" loading="lazy" width="400" height="300"></button>'
        % (e(p), i + 1, e(p), e(b['name']), i + 1)
        for i, p in enumerate(photos))

    # --- apartments
    apts = ''
    for a in b['apartments']:
        name = a['name']
        guests = a.get('guests', 2)
        beds = a.get('beds', 1)
        baths = a.get('baths', 1)
        sqm = a.get('sqm', '')
        photo = a.get('img') or hero
        apt_link = apt_href(b, name)
        # "Check Availability" must reach the first-party booking engine, not a
        # mail client: the engine reads city/unit from the query string and runs
        # the availability call against the booking API.
        apt_book = booking_href(b, name)
        apts += '''<article class="apt-card">
  <a class="apt-photo" href="%s"><img src="%s" alt="%s" loading="lazy" width="640" height="480"></a>
  <div class="apt-body">
    <h3><a href="%s">%s</a></h3>
    <ul class="apt-meta">
      <li>%s guests</li><li>%s bed%s</li><li>%s bath%s</li>%s
    </ul>
    <a class="btn-outline" href="%s">Check Availability</a>
  </div>
</article>''' % (e(apt_link), e(photo), e(name), e(apt_link), e(name),
                e(guests), e(beds), '' if beds == 1 else 's',
                e(baths), '' if baths == 1 else 's',
                ('<li>%s m&sup2;</li>' % e(sqm)) if sqm else '',
                e(apt_book))

    # --- facilities
    facs = ''.join('<div class="fac-item">%s<p>%s</p></div>' % (FAC_ICON, e(f)) for f in b['facilities'])

    # --- subnav (real sub-pages when they exist)
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

%s''' % (e(hero), e(b['name']), e(c['slug']), e(c['name']), e(b['name']),
         e(b['name']), e(b.get('address', '')), e(booking_href(b, b['apartments'][0]['name'] if b['apartments'] else '')),
         subnav, e(b['name']), apts, thumbs, facs, cta_band())

    return shell(b['title'], b['meta'], body, active=c['slug'])
