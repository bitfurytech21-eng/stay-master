#!/usr/bin/env python3
"""Generate the pages that were missing from the rebuild.

Reads data/extra.json (extracted from the live site) and data/site.json, and
writes:
  * top-level pages (about, why-master, locations, luxury-apartments,
    special-offers, contact-us, careers, privacy, terms-of-use, black-friday)
  * per-city family-apartments pages
  * why-master sub-pages (business, families, leisure, long-stays)
  * per-building sub-pages (reviews, special-offers, facilities, location, faq,
    apartments)
  * apartment detail pages

All pages reuse the existing styles.css / script.js and the site chrome from
build.py, so they look and behave like the rest of the site.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build as B  # noqa: E402

ROOT = B.ROOT
EXTRA = json.load(open(os.path.join(ROOT, 'data', 'extra.json'), encoding='utf-8'))

BUILDING_BY_SLUG = {b['slug']: b for b in B.BUILDINGS}
# the live site has a second URL for the same Tel Aviv building; our site
# uses the mazeh-tel-aviv slug, so master-mazeh maps onto it
ALIAS = {'tel-aviv/master-mazeh': 'tel-aviv/mazeh-tel-aviv'}

# sub-pages that are duplicates of another sub-page on the live site
SKIP_SUB = {'poznaj-nasze-apartamenty'}


def flat(slug):
    return slug.replace('/', '-')


def building_for(parent):
    # keys flatten the slug's '/' to '_' (e.g. athens_master-plaka-athens)
    slug = parent.replace('_', '/', 1)
    slug = ALIAS.get(slug, slug)
    return BUILDING_BY_SLUG.get(slug)


def prose(blocks, skip_h1=True):
    """Render extracted blocks into the site's .prose markup."""
    parts = []
    for b in blocks:
        t = b['t']
        if t == 'h1' and skip_h1:
            continue
        if t == 'img':
            continue  # never hotlink the live site's images
        if t == 'ul':
            parts.append('<ul>%s</ul>' % ''.join('<li>%s</li>' % B.e(i) for i in b['items']))
        elif t in ('h2', 'h3', 'h4'):
            parts.append('<%s>%s</%s>' % (t, B.e(b['text']), t))
        else:
            parts.append('<p>%s</p>' % B.e(b['text']))
    return ''.join(parts)


def crumbs(items):
    """items: list of (href, label); last one is the current page."""
    out = ['<a href="index.html">master</a>']
    for i, (href, label) in enumerate(items):
        out.append('<span aria-hidden="true">&gt;</span>')
        if i == len(items) - 1:
            out.append('<span aria-current="page">%s</span>' % B.e(label))
        else:
            out.append('<a href="%s">%s</a>' % (B.e(href), B.e(label)))
    return ''.join(out)


def page(title, desc, h1, blocks, active='', crumb=None, extra_html='', cta=None):
    body = '''<section class="section section--tight">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb">%s</nav>
    <h1>%s</h1>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="prose">%s</div>
    %s
  </div>
</section>

%s''' % (crumb or crumbs([('', h1)]), B.e(h1), prose(blocks), extra_html,
         B.cta_band(cta) if cta is not None else B.cta_band())
    return B.shell(title, desc, body, active=active)


# ------------------------------------------------------------------ top level

TOP = {
    'about': ('About us', 'about.html'),
    'why-master': ('Why master', 'why-master.html'),
    'locations': ('Locations', 'locations.html'),
    'luxury-apartments': ('Luxury Apartments', 'luxury-apartments.html'),
    'special-offers': ('Special Offers', 'special-offers.html'),
    'contact-us': ('Contact Us', 'contact-us.html'),
    'careers': ('Careers', 'careers.html'),
    'privacy': ('Privacy', 'privacy.html'),
    'terms-of-use': ('Terms of use', 'terms-of-use.html'),
    'black-friday-sale-terms-and-conditions': ('Black Friday terms', 'black-friday-sale-terms-and-conditions.html'),
}


# The enquiry form posts to the backend API. The endpoint is injected at build
# time so the static page and the API can live on different hosts.
ENQUIRY_ENDPOINT = os.environ.get('ENQUIRY_ENDPOINT', '/api/enquiries')

CONTACT_FORM = """
<form class="enquiry-form" id="enquiryForm" method="post" action="%(endpoint)s" novalidate>
  <div class="ef-row">
    <label for="ef-name">Your name <span aria-hidden="true">*</span></label>
    <input id="ef-name" name="name" type="text" autocomplete="name" required maxlength="120">
    <p class="ef-error" data-for="name" hidden></p>
  </div>
  <div class="ef-row">
    <label for="ef-email">Email <span aria-hidden="true">*</span></label>
    <input id="ef-email" name="email" type="email" autocomplete="email" required maxlength="200">
    <p class="ef-error" data-for="email" hidden></p>
  </div>
  <div class="ef-row">
    <label for="ef-phone">Phone (optional)</label>
    <input id="ef-phone" name="phone" type="tel" autocomplete="tel" maxlength="40">
  </div>
  <div class="ef-row">
    <label for="ef-city">Which city?</label>
    <select id="ef-city" name="city">
      <option value="">No preference</option>
      %(cities)s
    </select>
  </div>
  <div class="ef-row ef-row--split">
    <div>
      <label for="ef-arrival">Arrival</label>
      <input id="ef-arrival" name="arrival" type="date">
    </div>
    <div>
      <label for="ef-departure">Departure</label>
      <input id="ef-departure" name="departure" type="date">
      <p class="ef-error" data-for="departure" hidden></p>
    </div>
  </div>
  <div class="ef-row">
    <label for="ef-guests">Guests</label>
    <input id="ef-guests" name="guests" type="text" inputmode="numeric" maxlength="20" placeholder="e.g. 2 adults, 1 child">
  </div>
  <div class="ef-row">
    <label for="ef-message">Your message <span aria-hidden="true">*</span></label>
    <textarea id="ef-message" name="message" rows="5" required maxlength="5000"></textarea>
    <p class="ef-error" data-for="message" hidden></p>
  </div>
  <!-- honeypot: hidden from people, tempting to bots -->
  <div class="ef-hp" aria-hidden="true">
    <label for="ef-website">Website</label>
    <input id="ef-website" name="website" type="text" tabindex="-1" autocomplete="off">
  </div>
  <input type="hidden" name="source_page" value="contact-us.html">
  <button class="btn-outline ef-submit" type="submit">Send enquiry</button>
  <p class="ef-status" id="efStatus" role="status" aria-live="polite"></p>
  <noscript><p class="ef-note">JavaScript is off, so the form cannot send. Please email
    <a href="mailto:easytravelagency@trustagent.space">easytravelagency@trustagent.space</a> instead.</p></noscript>
</form>
"""


def contact_form_html():
    cities = ''.join('<option value="%s">%s</option>' % (B.e(c['name']), B.e(c['name']))
                     for c in B.CITIES)
    return CONTACT_FORM % {'endpoint': B.e(ENQUIRY_ENDPOINT), 'cities': cities}


def build_top():
    out = {}
    for key, (label, fname) in TOP.items():
        d = EXTRA.get('top_' + key)
        if not d:
            continue
        h1 = d['h1'] or label
        title = d['title'] or ('%s | master' % label)
        desc = d['desc'] or ('%s \u2014 master serviced apartments and aparthotels.' % label)
        extra = contact_form_html() if key == 'contact-us' else ''
        out[fname] = page(title, desc, h1, d['blocks'],
                          crumb=crumbs([('', label)]), extra_html=extra)
    return out


# ------------------------------------------------------------------ family

def build_family():
    out = {}
    for key, d in EXTRA.items():
        if not key.startswith('fam'):
            continue
        city_slug = key[3:].replace('_family-apartments', '')
        c = B.CITY_BY_SLUG.get(city_slug)
        if not c:
            continue
        h1 = d['h1'] or ('Family apartments in %s' % c['name'])
        title = d['title'] or ('Family Apartments in %s | master' % c['name'])
        desc = d['desc'] or ('Family serviced apartments in %s from master.' % c['name'])
        crumb = crumbs([(c['slug'] + '.html', c['name']), ('', 'Family apartments')])
        out['%s-family-apartments.html' % city_slug] = page(
            title, desc, h1, d['blocks'], active=c['slug'], crumb=crumb)

    # Bat Yam and Warsaw have no family page on the live site, but our city
    # pages link to one, so build it from the city's own family copy.
    for slug in ('bat-yam', 'warsaw'):
        c = B.CITY_BY_SLUG.get(slug)
        if not c or ('%s-family-apartments.html' % slug) in out:
            continue
        blocks = [
            {'t': 'p', 'text': c['family']},
            {'t': 'h2', 'text': 'Family apartments in %s' % c['name']},
            {'t': 'p', 'text': c['intro']},
        ]
        out['%s-family-apartments.html' % slug] = page(
            'Family Apartments in %s | master' % c['name'],
            'Family serviced apartments in %s from master.' % c['name'],
            'Family apartments in %s' % c['name'],
            blocks, active=slug,
            crumb=crumbs([(slug + '.html', c['name']), ('', 'Family apartments')]))
    return out


# ------------------------------------------------------------------ why-master subs

WHY_LABEL = {
    'business': 'For business',
    'families': 'For families',
    'leisure': 'For leisure',
    'long-stays': 'For long stays',
}


def build_why():
    out = {}
    subs = []
    for key, d in EXTRA.items():
        if not key.startswith('whywhy-master_'):
            continue
        sub = key[len('whywhy-master_'):]
        label = WHY_LABEL.get(sub, sub.replace('-', ' ').title())
        h1 = d['h1'] or ('master %s' % label)
        title = d['title'] or ('%s | Why master' % label)
        desc = d['desc'] or ('%s \u2014 why master serviced apartments work for you.' % label)
        crumb = crumbs([('why-master.html', 'Why master'), ('', label)])
        out['why-master-%s.html' % sub] = page(title, desc, h1, d['blocks'], crumb=crumb)
        subs.append(('why-master-%s.html' % sub, label))
    return out, subs


def add_why_index(pages, subs):
    """Link the four audience sub-pages from 'Why master'.

    Runs after build_top() so why-master.html exists when we inject into it;
    without this the sub-pages were generated but nothing linked to them.
    """
    if not subs or 'why-master.html' not in pages:
        return
    order = ['business', 'families', 'leisure', 'long-stays']
    subs.sort(key=lambda t: next((i for i, o in enumerate(order)
                                 if t[0] == 'why-master-%s.html' % o), 99))
    links = ''.join('<li><a href="%s">master %s</a></li>' % (href, B.e(label))
                   for href, label in subs)
    index_html = ('\n<section class="section section--cream">\n  <div class="wrap">\n'
                  '    <div class="section-head">\n'
                  '      <p class="eyebrow">Who it suits</p>\n'
                  '      <h2>Find the stay that fits</h2>\n'
                  '    </div>\n'
                  '    <ul class="why-links">%s</ul>\n'
                  '  </div>\n</section>\n' % links)
    pages['why-master.html'] = pages['why-master.html'].replace(
        '</main>', index_html + '</main>')


# ------------------------------------------------------------------ building subs

SUB_LABEL = {
    'reviews': 'Reviews',
    'special-offers': 'Special Offers',
    'facilities': 'Services & facilities',
    'services-facilities': 'Services & facilities',
    'location': 'The location',
    'the-location': 'The location',
    'faq': 'FAQ',
    'apartments': 'The apartments',
}


def build_subs():
    out = {}
    for key, d in EXTRA.items():
        if not key.startswith('sub'):
            continue
        rest = key[3:]
        if '__' not in rest:
            continue
        parent, sub = rest.split('__', 1)
        if sub in SKIP_SUB:
            continue
        b = building_for(parent)
        if not b:
            continue
        c = B.CITY_BY_SLUG[b['city']]
        label = SUB_LABEL.get(sub, sub.replace('-', ' ').title())
        h1 = d['h1'] or ('%s \u2014 %s' % (b['name'], label))
        title = d['title'] or ('%s %s | %s | master' % (b['name'], label, c['name']))
        desc = d['desc'] or ('%s %s at %s, %s.' % (b['name'], label.lower(), b['address'], c['name']))
        crumb = crumbs([(c['slug'] + '.html', c['name']),
                        (B.page_path(b), b['name']),
                        ('', label)])

        extra_html = ''
        if sub == 'reviews':
            # the live page is a JS widget with no server-rendered reviews;
            # point guests at the verified source instead of inventing any
            extra_html = ('<p class="note">Guest reviews for %s are published on the '
                          'booking platforms. Live ratings and recent guest comments are '
                          'shown on the reservation system.</p>' % B.e(b['name']))
        elif sub == 'special-offers':
            extra_html = ('<p class="note">Current rates and any running offers for %s are '
                          'confirmed on the reservation system, or by email.</p>' % B.e(b['name']))
        elif sub == 'apartments':
            # Index every apartment detail page for this building, including any
            # type that has no card on the building page, so no detail page is
            # left with no way in.
            items = []
            for apt_key, apt_data in sorted(EXTRA.items()):
                if not apt_key.startswith('apt'):
                    continue
                rest = apt_key[3:]
                if '__' not in rest:
                    continue
                parent, apt_slug = rest.split('__', 1)
                if building_for(parent) is not b:
                    continue
                apt_title = apt_data['h1'] or apt_slug.replace('-', ' ').title()
                items.append('<li><a href="%s-apartments-%s.html">%s</a></li>'
                             % (flat(b['slug']), apt_slug, B.e(apt_title)))
            if items:
                extra_html = ('<div class="section-head"><h2>All apartment types</h2></div>'
                              '<ul class="apt-index">%s</ul>' % ''.join(items))

        out['%s-%s.html' % (flat(b['slug']), sub)] = page(
            title, desc, h1, d['blocks'], active=c['slug'], crumb=crumb,
            extra_html=extra_html, cta=b)
    return out


# ------------------------------------------------------------------ apartments

def specs_from(blocks):
    """Pull the '1-2 Guests / 1 Bedroom / 1 Bathroom' list out of the blocks."""
    for b in blocks:
        if b['t'] == 'ul' and b['items'] and re.search(r'guest', b['items'][0], re.I):
            return b['items'][:4]
    return []


# ------------------------------------------------- apartment slug mapping
# Our site.json apartment names are shorter than the live site's slugs
# ("Studio" vs "inner-lightwell-studio"), so we match them by token overlap
# and record the mapping for build.py to use when linking the cards.

STOP = {'apartment', 'apartments', 'with', 'and', 'the', 'a', 'of', 'in', 'at',
        'suite', 'suites', 'pax'}


def _norm(s):
    s = s.lower().replace('&', ' and ')
    out = set()
    for t in re.findall(r'[a-z0-9]+', s):
        if t in STOP:
            continue
        if t.endswith('bedrooms'):
            t = 'bedroom'
        if t.endswith('s') and len(t) > 4:
            t = t[:-1]
        out.add(t)
    return out


def build_aptmap():
    """(building_slug, apartment_name) -> live apartment slug.

    Greedy ONE-TO-ONE assignment: a live apartment page is claimed by at most
    one card, so two cards can never link to the same detail page (which used
    to happen for 'Studio' vs 'Inner Lightwell Studio' and left the other
    page unreachable).
    """
    gap = json.load(open('/tmp/gap.json', encoding='utf-8'))
    m = {}
    for b in B.BUILDINGS:
        live = gap['apts'].get(b['slug'])
        if not live:
            continue
        pairs = []
        for row in b['apts']:
            name = row[0]
            n = _norm(name)
            for L in live:
                score = len(n & _norm(L.replace('-', ' ')))
                if score:
                    pairs.append((score, name, L))
        pairs.sort(key=lambda t: (-t[0], t[1], t[2]))
        taken_slug, taken_name = set(), set()
        for score, name, L in pairs:
            if name in taken_name or L in taken_slug:
                continue
            m['%s|%s' % (b['slug'], name)] = L
            taken_name.add(name)
            taken_slug.add(L)
    return m


def build_apartments():
    out = {}
    for key, d in EXTRA.items():
        if not key.startswith('apt'):
            continue
        rest = key[3:]
        if '__' not in rest:
            continue
        parent, apt = rest.split('__', 1)
        b = building_for(parent)
        if not b:
            continue
        c = B.CITY_BY_SLUG[b['city']]
        h1 = d['h1'] or apt.replace('-', ' ').title()
        title = d['title'] or ('%s | %s | master' % (h1, b['name']))
        desc = d['desc'] or ('%s at %s, %s.' % (h1, b['name'], c['name']))

        specs = specs_from(d['blocks'])
        spec_html = ''
        if specs:
            spec_html = '<ul class="apt-specs">%s</ul>' % ''.join(
                '<li><span>%s</span></li>' % B.e(s) for s in specs)

        photo = B.img(b, 1)
        hero = '''<section class="bhero">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb">%s</nav>
    <div class="bhero-top">
      <div>
        <h1>%s</h1>
        <p class="addr">%s &nbsp;\u00b7&nbsp; <a href="%s">%s</a></p>
      </div>
    </div>
    <div class="bhero-gallery">
      <div class="bg-cell">
        <img src="%s" alt="%s" width="1024" height="683" loading="eager" decoding="async">
      </div>
    </div>
  </div>
</section>''' % (crumbs([(c['slug'] + '.html', c['name']),
                        (B.page_path(b), b['name']),
                        ('', h1)]),
                 B.e(h1), B.e(b['address']), B.page_path(b), B.e(b['name']),
                 photo, B.e(h1))

        body = '''%s

<section class="section">
  <div class="wrap">
    %s
    <div class="prose">%s</div>
  </div>
</section>

%s''' % (hero, spec_html, prose(d['blocks']), B.cta_band(b))

        out['%s-apartments-%s.html' % (flat(b['slug']), apt)] = B.shell(
            title, desc, body, active=c['slug'],
            book_href=B.mailto('Booking enquiry \u2014 %s, %s' % (h1, b['name']),
                               'Hello,\n\nI would like to enquire about availability for the '
                               '%s at %s, %s.\n\nArrival:\nDeparture:\nGuests:\n\nThank you.'
                               % (h1, b['name'], b['address'])),
            book_label='Enquire by email')
    return out


# ------------------------------------------------------------------ write

def main():
    # publish the apartment slug map so build.py links cards to the right page
    aptmap = build_aptmap()
    json.dump(aptmap, open(os.path.join(ROOT, 'data', 'aptmap.json'), 'w',
                           encoding='utf-8'), ensure_ascii=False, indent=1)
    print('aptmap entries: %d' % len(aptmap))

    pages = {}
    pages.update(build_top())
    pages.update(build_family())
    why_pages, why_subs = build_why()
    pages.update(why_pages)
    add_why_index(pages, why_subs)
    pages.update(build_subs())
    pages.update(build_apartments())

    for name, content in pages.items():
        with open(os.path.join(ROOT, name), 'w', encoding='utf-8') as f:
            f.write(content)

    print('wrote %d extra pages' % len(pages))
    groups = {}
    for n in pages:
        if '-apartments-' in n:
            g = 'apartment detail'
        elif n.endswith('-family-apartments.html'):
            g = 'family'
        elif n.startswith('why-master-'):
            g = 'why-master sub'
        elif any(n.endswith('-%s.html' % s) for s in SUB_LABEL):
            g = 'building sub'
        else:
            g = 'top level'
        groups[g] = groups.get(g, 0) + 1
    for g, n in sorted(groups.items()):
        print('  %-18s %d' % (g, n))


if __name__ == '__main__':
    main()
