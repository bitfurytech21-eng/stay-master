#!/usr/bin/env python3
"""Real property-page content, taken from data/extra.json.

The building (property) pages used to render generic boilerplate: a fixed
seven-question FAQ, facility names with no descriptions, and a "Getting here"
paragraph that only said "use the map". The live site's own property pages
carry far more than that, and it was already extracted into data/extra.json
(the per-building sub-pages: facilities, faq, location, apartments).

This module turns those extracted blocks into the markup the building page
needs, so each property page shows its own real content instead of the same
placeholder text on all thirteen.

Nothing here invents copy: every string comes from extra.json. Where a
building has no extracted sub-page, the caller falls back to the old
boilerplate.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))

# the live site has a second URL for the same Tel Aviv building
ALIAS = {'tel-aviv/master-mazeh': 'tel-aviv/mazeh-tel-aviv'}

# Words that begin a description sentence. A facility item is stored as one
# string ("Laundry Room An on-site laundry room equipped for your
# convenience..."), so the name is everything before the first of these.
_DESC_STARTS = {
    'A', 'An', 'The', 'Our', 'Your', 'This', 'These', 'It', 'We', 'You',
    'Relax', 'Dive', 'Stay', 'Indulge', 'Enjoy', 'Unwind', 'Keep', 'Take',
    'Store', 'Arriving', 'Welcome', 'Convenient', 'Secure', 'Experience',
    'Discover', 'Escape', 'Pack', 'Settle', 'Unwind', 'Start', 'Make',
    'Whether', 'Perfect', 'Ideal', 'Designed', 'Located', 'Offering',
    'Available', 'Access', 'Step', 'Begin', 'Find', 'Get', 'Feel',
}


def _load_extra():
    p = os.path.join(ROOT, 'data', 'extra.json')
    if not os.path.exists(p):
        return {}
    with open(p, encoding='utf-8') as f:
        return json.load(f)


EXTRA = _load_extra()


def _sub(b, *keys):
    """Return the extracted sub-page dict for a building, or None."""
    slug = ALIAS.get(b['slug'], b['slug'])
    parent = 'sub' + slug.replace('/', '_')
    for k in keys:
        d = EXTRA.get(parent + '__' + k)
        if d and d.get('blocks'):
            return d
    return None


_NAV_LABELS = {
    'the apartments', 'apartments', 'the neighborhood', 'the neighbourhood',
    'facilities', 'special offers', 'reviews', 'faq', 'overview',
}


def _is_nav_ul(items):
    """The extracted pages start with the site's own section menu as a <ul>.

    Those items are short labels ("The Apartments", "Facilities", ...). A real
    content list is either longer prose or questions, so match on the labels
    themselves rather than on any word appearing anywhere in the list \u2014 an FAQ
    answer that happens to mention "facilities" must not be mistaken for it.
    """
    if len(items) < 4:
        return False
    if any('?' in i for i in items):
        return False
    if any(len(i) > 40 for i in items):
        return False
    hits = sum(1 for i in items if i.strip().lower() in _NAV_LABELS)
    return hits >= 3


def _norm(s):
    return re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip()


def _split_facility(item):
    """Split 'Name Description...' into (name, description)."""
    item = item.strip()
    # A name carrying its detail in parentheses ("Breakfast Available Nearby
    # (Served at Symposio Restaurant, 70 metres away)") reads badly as a
    # heading, so lift the parenthetical out into the description.
    m = re.match(r'^([^(]{3,60}?)\s*\((.+)\)\s*\.?$', item)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    words = item.split()
    for i, w in enumerate(words):
        if i > 0 and w.strip('.,;:') in _DESC_STARTS:
            return ' '.join(words[:i]).strip(), ' '.join(words[i:]).strip()
    return item, ''


# ------------------------------------------------------------------ facilities

def facilities(b):
    """[(name, description)] \u2014 site.json names first, then any extra ones."""
    out = []
    index = {}
    for name in b.get('facilities') or []:
        # site.json sometimes stores the whole sentence as the name; split it
        # the same way so the card gets a short heading and a description.
        nm, desc = _split_facility(name)
        key = _norm(nm)
        if key and key not in index:
            index[key] = len(out)
            out.append([nm, desc])

    d = _sub(b, 'facilities', 'services-facilities')
    if d:
        for bl in d['blocks']:
            if bl['t'] != 'ul' or _is_nav_ul(bl['items']):
                continue
            for item in bl['items']:
                name, desc = _split_facility(item)
                if not name:
                    continue
                key = _norm(name)
                if key in index:
                    if desc and not out[index[key]][1]:
                        out[index[key]][1] = desc
                else:
                    index[key] = len(out)
                    out.append([name, desc])
    return [(n, d) for n, d in out]


# ------------------------------------------------------------------------- faq

def faq(b):
    """[{'title': group, 'items': [(question, answer)]}]"""
    d = _sub(b, 'faq')
    if not d:
        return []
    groups = []
    cur = None
    for bl in d['blocks']:
        t = bl['t']
        if t == 'h2':
            cur = {'title': bl['text'].strip(), 'items': []}
            groups.append(cur)
        elif t == 'ul' and cur is not None and not _is_nav_ul(bl['items']):
            for item in bl['items']:
                q, sep, a = item.partition('?')
                if not sep:
                    continue
                q = (q + '?').strip()
                a = a.strip()
                if q and a:
                    cur['items'].append((q, a))
    return [g for g in groups if g['items']]


# -------------------------------------------------------------------- location

def location(b):
    """{'paras': [...], 'nearby': [...], 'getting': [...]} or None."""
    d = _sub(b, 'location', 'the-location')
    if not d:
        return None
    paras, nearby, getting = [], [], []
    mode = None
    for bl in d['blocks']:
        t = bl['t']
        if t == 'ul':
            if _is_nav_ul(bl['items']):
                continue
            if mode == 'nearby':
                nearby.extend(bl['items'])
            elif mode == 'getting':
                getting.extend(bl['items'])
            continue
        if t == 'h2':
            low = bl['text'].lower()
            if 'nearby' in low:
                mode = 'nearby'
            elif 'getting' in low:
                mode = 'getting'
            else:
                mode = None
            continue
        if t == 'h3':
            continue
        if t == 'p':
            txt = bl['text'].strip()
            if txt.lower() in ('read more', 'read less'):
                continue
            if mode is None:
                paras.append(txt)
    if not (paras or nearby or getting):
        return None
    # The page already prints the address in the section head and again under
    # "Our address", so drop a leading paragraph that is just the address.
    addr = _norm(b.get('address') or '')
    paras = [p for p in paras if _norm(p) != addr]
    return {'paras': paras, 'nearby': nearby, 'getting': getting}


# ------------------------------------------------------------------ apartments

def apartments_intro(b):
    """The property's own 'The Apartments' intro, or None."""
    d = _sub(b, 'apartments')
    if not d:
        return None
    out = []
    for bl in d['blocks']:
        t = bl['t']
        if t == 'p':
            txt = bl['text'].strip()
            if txt.lower() in ('read more', 'read less'):
                break
            out.append(txt)
        elif t in ('h3', 'h2'):
            break
    return ' '.join(out) if out else None


# ---------------------------------------------------------------------- render

FAC_ICON = ('<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" '
            'stroke-width="1.5" aria-hidden="true"><path d="M4 20V9l8-5 8 5v11"/>'
            '<path d="M9 20v-6h6v6"/></svg>')


def _e(s):
    import html
    return html.escape(str(s), quote=True)


def fac_cards(b):
    """Facility cards with a real description under each name."""
    cards = []
    for name, desc in facilities(b):
        body = '<h3>%s</h3>' % _e(name)
        if desc:
            body += '<p>%s</p>' % _e(desc)
        cards.append('<div class="fac-item">%s<div>%s</div></div>' % (FAC_ICON, body))
    return ''.join(cards)


def faq_html(b):
    """Grouped, real Q&A as <details> blocks."""
    groups = faq(b)
    if not groups:
        return ''
    parts = []
    for g in groups:
        parts.append('<h3 class="faq-group">%s</h3>' % _e(g['title']))
        for q, a in g['items']:
            parts.append('<details><summary>%s</summary><p>%s</p></details>' % (_e(q), _e(a)))
    return ''.join(parts)


def location_html(b):
    """Real neighbourhood copy, nearby landmarks and directions."""
    loc = location(b)
    if not loc:
        return ''
    parts = []
    if loc['paras']:
        parts.append('<h3>The neighbourhood</h3>')
        for p in loc['paras']:
            parts.append('<p>%s</p>' % _e(p))
    if loc['nearby']:
        parts.append('<h3>Nearby</h3><ul>%s</ul>'
                     % ''.join('<li>%s</li>' % _e(x) for x in loc['nearby']))
    if loc['getting']:
        parts.append('<h3>Getting here</h3><ul>%s</ul>'
                     % ''.join('<li>%s</li>' % _e(x) for x in loc['getting']))
    return ''.join(parts)


def property_content(b):
    """Everything the building page needs, in one dict."""
    return {
        'fac_cards': fac_cards(b),
        'faq_html': faq_html(b),
        'loc_html': location_html(b),
        'apt_intro': apartments_intro(b),
        'has_faq': bool(faq(b)),
        'has_loc': bool(location(b)),
    }
