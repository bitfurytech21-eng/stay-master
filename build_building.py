#!/usr/bin/env python3
"""Building (property) page template for the master site.

The data preparation lives in build_building_parts.py; this module only lays
the prepared pieces into the page markup.
"""
import os


def _helpers():
    import build
    return build


def build_building(b):
    _m = _helpers()
    e = _m.e
    shell = _m.shell
    cta_band = _m.cta_band
    mailto = _m.mailto
    from build_building_parts import building_parts
    p = building_parts(b)
    c = p['c']
    n = p['n']
    cells = p['cells']
    grid_cells = p['grid_cells']
    apts = p['apts']
    facs = p['facs']
    apt_more = p['apt_more']
    nav_items = p['nav_items']
    faq_html = p['faq_html']
    loc_html = p['loc_html']
    apt_intro = p['apt_intro']

    body = '''<section class="bhero">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="index.html">master</a><span aria-hidden="true">&gt;</span><a href="%s.html">%s</a><span aria-hidden="true">&gt;</span><span aria-current="page">%s</span>
    </nav>
    <div class="bhero-top">
      <div>
        <h1>%s</h1>
        <p class="addr">%s &nbsp;\u00b7&nbsp; <a href="#location">Map</a></p>
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
%s
    </ul>
  </div>
</nav>

<section class="section" id="overview">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">%s \u00b7 %s</p>
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
          <p>The interactive map could not load. The address is %s.</p>
        </div>
      </div>
      <div class="getting-here">
        <h3>Our address</h3>
        <p>%s</p>
        %s
        <ul>
          <li>Check-in from %s, check-out by %s.</li>
          <li>Reception and support are remote \u2014 details are sent before arrival.</li>
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
    <div class="faq">%s</div>
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
         ''.join(nav_items),
         e(c['name']), e(b['kind']), e(b['name']),
         e(b['intro']), e(b['more']),
         b['apartments'], e(apt_intro), apt_more, ''.join(apts),
         facs,
         e(c['name']), e(b['address']),
         b['lat'], b['lon'], e(b['name']), b['name'], e(b['address']),
         e(b['address']), loc_html,
         e(b['checkin']), e(b['checkout']),
         e(b['checkin']), e(b['checkout']), b['apartments'], e(b['bedrooms']),
         faq_html,
         e(b['name']), ''.join(grid_cells),
         cta_band(b))

    title = '%s | %s | master' % (b['name'], c['name'])
    desc = '%s \u2014 %d serviced apartments at %s. %s' % (b['name'], b['apartments'], b['address'], b['bedrooms'])

    lb = '''<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" hidden>
  <button class="lb-close" id="lbClose" type="button" aria-label="Close photo viewer">&times;</button>
  <button class="lb-nav lb-prev" id="lbPrev" type="button" aria-label="Previous photo">&#8249;</button>
  <figure class="lb-figure">
    <img id="lbImage" src="" alt="">
    <figcaption id="lbCaption"></figcaption>
  </figure>
  <button class="lb-nav lb-next" id="lbNext" type="button" aria-label="Next photo">&#8250;</button>
</div>'''

    page = shell(title, desc, body, active=c['slug'],
                 book_href=mailto('Booking enquiry \u2014 %s' % b['name'],
                                  'Hello,\n\nI would like to enquire about availability at %s, %s.\n\n'
                                  'Arrival:\nDeparture:\nGuests:\nApartment type:\n\nThank you.' % (
                                      b['name'], b['address'])),
                 book_label='Enquire by email')
    page = page.replace('</main>', lb + '\n</main>')
    return page
