#!/usr/bin/env python3
"""Home and city page renderers for the master site.

Split out of build_pages.py so each module stays a manageable size. Shared
helpers are imported from build.py at call time.
"""
import os


def _helpers():
    import build
    return build


def build_home():
    _m = _helpers()
    CITIES = _m.CITIES
    BUILDINGS = _m.BUILDINGS
    CITY_BY_SLUG = _m.CITY_BY_SLUG
    e = _m.e
    shell = _m.shell
    cta_band = _m.cta_band
    families = _m.families
    building_card = _m.building_card
    buildings_in = _m.buildings_in
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
    _m = _helpers()
    e = _m.e
    buildings_in = _m.buildings_in
    building_card = _m.building_card
    families = _m.families
    cta_band = _m.cta_band
    shell = _m.shell
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
