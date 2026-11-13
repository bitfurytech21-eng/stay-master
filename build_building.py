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
    osm = p['osm']
    gmaps = p['gmaps']

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
%s
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
         ''.join(nav_items),
         e(c['name']), e(b['kind']), e(b['name']),
         e(b['intro']), e(b['more']),
         b['apartments'], e(b['aptIntro']), apt_more, ''.join(apts),
         facs,
         e(c['name']), e(b['address']),
         b['lat'], b['lon'], e(b['name']), b['name'],
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

    page = shell(title, desc, body, active=c['slug'],
                 book_href=mailto('Booking enquiry — %s' % b['name'],
                                  'Hello,\n\nI would like to enquire about availability at %s, %s.\n\n'
                                  'Arrival:\nDeparture:\nGuests:\nApartment type:\n\nThank you.' % (
                                      b['name'], b['address'])),
                 book_label='Enquire by email')
    page = page.replace('</main>', lb + '\n</main>')
    return page
