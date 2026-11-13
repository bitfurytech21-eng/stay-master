#!/usr/bin/env python3
"""Page chrome for the master site: header, footer, shell, CTA band, cards.

Split out of build.py so each module stays a manageable size. Shared helpers
are imported from build.py at call time (build.py imports this module at the
end of its own file, so a module-level import back would be circular).
"""
import os


def _helpers():
    import build
    return build


# ---------------------------------------------------------------- chrome

def header(active='', book_href=None, book_label='Book Now'):
    _m = _helpers()
    CITIES = _m.CITIES
    e = _m.e
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
    _m = _helpers()
    CITIES = _m.CITIES
    e = _m.e
    page_path = _m.page_path
    buildings_in = _m.buildings_in
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
            <li><a href="luxury-apartments.html">Luxury Apartments</a></li>
            <li><a href="special-offers.html">Special Offers</a></li>
            <li><a href="about.html">About us</a></li>
            <li><a href="mailto:easytravelagency@trustagent.space">Contact Us</a></li>
            <li><a href="contact-us.html">Contact</a></li>
            <li><a href="privacy.html">Privacy</a></li>
            <li><a href="terms-of-use.html">Terms of use</a></li>
            <li><a href="black-friday-sale-terms-and-conditions.html">Offer terms</a></li>
          </ul>
          <p class="footer-email"><a href="mailto:easytravelagency@trustagent.space">easytravelagency@trustagent.space</a></p>
          <p class="copyright">&copy; 2025 master</p>
        </div>
      </div>
    </div>
  </div>
</footer>''' % ''.join(cols)


def shell(title, desc, body, active='', book_href=None, book_label='Book Now'):
    _m = _helpers()
    e = _m.e
    header = _m.header
    footer = _m.footer
    return '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<meta name="description" content="%s">
<meta name="theme-color" content="#003319">
<link rel="stylesheet" href="vendor/leaflet/leaflet.css">
<link rel="stylesheet" href="styles.css?v=4">
</head>
<body>

<a class="skip-link" href="#main">Skip to content</a>

%s

<main id="main">
%s
</main>

%s

<script src="vendor/leaflet/leaflet.js"></script>
<script src="script.js?v=3"></script>
</body>
</html>
''' % (e(title), e(desc), header(active, book_href, book_label), body, footer())


def cta_band(b=None):
    _m = _helpers()
    e = _m.e
    # All booking calls now use the first-party reservation platform.
    book = 'booking.html'
    label = 'Book Now'
    where = (' — ' + e(b['name'])) if b else ''
    return '''<section class="cta-band" id="offer">
  <div class="wrap">
    <div class="cta-inner">
      <div>
        <h2>Book directly with master and get 5%% off</h2>
        <p>Save More, Stay More: Book Directly With master For A 5%% Discount Today!%s</p>
      </div>
      <a class="btn-cream" href="%s">%s</a>
    </div>
  </div>
</section>''' % (where, e(book), label)


def families(city):
    _m = _helpers()
    e = _m.e
    return '''<section class="section section--sand">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">%s with the family</p>
      <h2>Where Families Stay Smarter</h2>
      <p>%s</p>
    </div>
    <a class="btn-outline" href="%s-family-apartments.html">Find out more</a>
  </div>
</section>''' % (e(city['name']), e(city['family']), city['slug'])


# ---------------------------------------------------------------- cards

def building_card(b):
    _m = _helpers()
    e = _m.e
    img = _m.img
    page_path = _m.page_path
    CITY_BY_SLUG = _m.CITY_BY_SLUG
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
